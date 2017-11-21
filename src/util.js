#

function DataUtil(raw_data)
{
    return {
        current_offset: 0,
        data: raw_data,
        
        len: function() {
            return this.data.length;
        },
        
        tell: function() {
            return this.current_offset;
        },
        
        skip: function(len) {
            this.current_offset+=len;
        },
        
        uint32_at: function(pos) {
            var b = this.data.slice(pos, pos+4);
            return (this.to_unsigned(b[3]) << 24) + (this.to_unsigned(b[2]) << 16) + (this.to_unsigned(b[1]) << 8) + this.to_unsigned(b[0]);
        },
        
        uint24_at: function(pos) {
            var b = this.data.slice(pos, pos+3);
            return (this.to_unsigned(b[2]) << 16) + (this.to_unsigned(b[1]) << 8) + this.to_unsigned(b[0]);
        },
        
        uint16_at: function(pos) {
            var b = this.data.slice(pos, pos+2);
            return (this.to_unsigned(b[1]) << 8) + this.to_unsigned(b[0]);
        },
        
        uint8_at: function(pos) {
            return this.to_unsigned(this.data[pos]);
        },
        
        read_at: function (len, offset) {
            var b = this.data.slice(offset, offset+len);
            return b.map(function(e){return this.to_unsigned(e);}, this);
        },
        
        bytes_prefix16: function() {
            var len = this.uint16_at(this.current_offset);
            this.current_offset += 2;
            return this.read(len);
        },
        
        bytes_prefix32: function() {
            var len = this.uint32_at(this.current_offset);
            this.current_offset += 4;
            return this.read(len);
        },
        
        uint24_at_pos: function(pos, from) {
            return this.uint24_at(this.getSeekBegin(from) + pos);
        },
        
        uint16_at_pos: function(pos, from) {
            return this.uint16_at(this.getSeekBegin(from) + pos);
        },
        
        uint8_at_pos: function(pos, from) {
            return this.uint8_at(this.getSeekBegin(from) + pos);
        },
        
        getSeekBegin: function(from) {
            switch(from) {
                case OS.SEEK_CUR:
                    return this.current_offset;
                case OS.SEEK_BEGIN:
                    return 0;
                case OS.SEEK_END:
                    return len();
                default:
                    throw new Error("Invalid seek flag.");
            }
        },
        
        offset: function(new_offset){
            this.current_offset = new_offset;
        },
        
        read: function(len) {
            var b = this.data.slice(this.current_offset, this.current_offset + len);
            this.current_offset += len;
            return b.map(function(e){return this.to_unsigned(e);}, this);
        },
        
        number_for_bigendian_array: function(arr) {
            return new java.math.BigInteger(arr);
        },

        to_unsigned: function(val) {
            return (val < 0) ? (val + 256): val;
        }
    };
}

function stringFromBytes(data, charset) {
    charset = charset || 'UTF8';
    var str = new java.lang.String(data, charset);
    if (str.indexOf(0xFFFD) > 0) { //UTF8 unmapped character
        return new java.lang.String(data, "GB18030");
    }
    return str;
}

/**
 * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
 * @param obj1
 * @param obj2
 * @returns obj3 a new object based on obj1 and obj2
 */
function mergeObject(obj1,obj2){
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
}


function newFilledArray(len, fill) {
    var arr = new Array(len);
    for(var i = 0; i<len; i++)
        arr[i] = fill;
    return arr;
}


var OS = {
    SEEK_BEGIN : 0,
    SEEK_CUR : 1,
    SEEK_END : 2
};