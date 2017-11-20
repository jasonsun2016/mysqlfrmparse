#

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

function mysqltypes_format_type(context) {
    return 'VARCHAR';
}