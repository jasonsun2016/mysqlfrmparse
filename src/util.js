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
        
        offset: function(new_offset){
            this.current_offset = new_offset;
        },
        
        read: function(len) {
            var b = this.data.slice(this.current_offset, this.current_offset + len);
            this.current_offset += len;
            return b.map(function(e){return this.to_unsigned(e);}, this);
        },

        to_unsigned: function(val) {
            return (val < 0) ? (val + 256): val;
        }
    };
}

function stringFromBytes(data, charset) {
    charset = charset || 'UTF8';
    return new java.lang.String(data, charset);
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