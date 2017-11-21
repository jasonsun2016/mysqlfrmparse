#
load('constants.js');
load('util.js');

var UNPACK_DEFUALT_HANDLER_MAP = {
    varchar: function(){},
    timestamp2: function(){}
};


//Unpack a default value from the defaults ("record") buffer
//
//:param defaults: util.ByteReader instance offset at the current
//                 record offset.
//:param context: A dict instance with context information for the
//                current column being unpacked. At a minimum we
//                expect members of:
//                    type_code - a MySQLType enum instance
//                    flags - BitFlags instance with field flags
//                    null_bit - current null bit offset pointing to
//                               the current columns bit position
//                               (if nullable)
//                    null_map - bit string of nullable column bits
//:returns: string of default value
function mysqltypes_unpack_default(defaults, context) {
    var no_default_value = context.flags.has('NO_DEFAULT');
    var is_auto_increment = (context.unireg_check === 'NEXT_NUMBER');
    
    if (no_default_value || is_auto_increment) {
        return null;
    }

    if (context.flags.has('MAYBE_NULL')) {
        var null_map = context.null_map;
        var offset = parseInt(context.null_bit / 8);
        var null_byte = null_map[offset];
        var null_bit = context.null_bit % 8;
        context.null_bit += 1;
        if ((null_byte & (1 << null_bit)) && (context.unireg_check !== 'BLOB_FIELD')) {
            return 'NULL';
        }
    }

    if (context.unireg_check === 'BLOB_FIELD') {
        // suppress default for blob types
        return null;
    }

    var type_name = context.type_code.toLowerCase();
    var dispatch = UNPACK_DEFUALT_HANDLER_MAP[type_name];
    
    if(dispatch) {
        return dispatch(defaults, context);
    }
    else {
        throw new Error("Unpack method not implemented for ${context.type_code}");
    }
}

function unpack_type_decimal(defaults, context) {
    return "'${strFromBytes(defaults.read(context.length), 'ascii')}'";
}

var DIG_PER_DEC1 = 9;
var DIGITS_TO_BYTES = [0, 1, 1, 2, 2, 3, 3, 4, 4, 4];

// help methods for the various decimal pack_flag lookups
function f_decimals(flags) {
    var FIELDFLAG_DEC_SHIFT = CONST_VALUE.DEC_SHIFT;
    var FIELDFLAG_MAX_DEC = CONST_VALUE.MAX_DEC;
    return (parseInt(flags) >> FIELDFLAG_DEC_SHIFT) & FIELDFLAG_MAX_DEC;
}

//"""Decode the decimal digits from a set of bytes
//
//This does not zero pad fractional digits - so these
//may need to be zerofilled or otherwise shifted. Only
//the raw decimal number string represented by the bytes
//will be returned without leading zeros.
//
//This is intended to decode MySQL's scheme of encoding
//up to 9 decimal digits into a 4 byte word for its
//fixed precision DECIMAL type.
//
//return string of decimal numbers
//
//Examples:
//     b'\x01' -> '1'
//     b'\x63' -> '99'
//     b'\x3b\x9a\xc9\xff' -> '999999999'
//"""
function _decode_decimal(data, invert) {
    invert = invert || false;
    var modcheck = data.length % 4;
    if (modcheck !== 0) {
        var pad = 4 - modcheck;
        var pad_char = invert? 255 : 0;
        var whole = data.slice(0, -modcheck);
        var frac = newFilledArray(pad, pad_char).concat(data.slice(-modcheck));
        data = whole.concat(frac);
    }
    var groups = new DataUtil().number_for_bigendian_array(data);
    if (invert)
        groups = map(operator.invert, groups)  //??
    return ''.join(str(i) for i in groups)
}



//Unpack a MySQL 5.0+ NEWDECIMAL value
//
//MySQL 5.0 packs decimal values into groups of 9 decimal digits
//per 4 byte word. The first byte encodes the sign bit as the
//most significant bit.  The first byte is always xor'd with
//0x80.
function unpack_type_newdecimal(defaults, context) {
    var precision = context.length;
    var scale = f_decimals(context.flags);
    if (scale)
        precision -= 1;
    if (precision)
        precision -= 1;

    var int_length = parseInt((precision - scale) / 9)*4 + DIGITS_TO_BYTES[(precision - scale) % 9]
    var frac_length = parseInt(scale / 9)*4 + DIGITS_TO_BYTES[scale % 9]
    var data = defaults.read(int_length + frac_length)

    var first = data[0];
    var sign = (first & 0x80) ? '': '-';
    data[0] = first ^ 0x80;
    var parts = [];
    if (int_length) {
        var integer_part = _decode_decimal(data.slice(0,int_length), sign);
        // remove insignificant zeros but ensure we have
        // at least one digit
        //integer_part = integer_part.lstrip('0') or '0'
        parts.push(sign + integer_part);
    }
    else {
        parts.push(sign + '0');
    }

    if (frac_length) {
        var fractional_part = _decode_decimal(data.slice(-frac_length), sign);
        parts.push(str(fractional_part).zfill(scale))
    }

    return "'${parts.join('.')}'";

}






function mysqltypes_format_type(context) {
    return 'VARCHAR';
}