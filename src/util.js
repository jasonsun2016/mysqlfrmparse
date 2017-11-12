#

function Util(raw_data)
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
            current_offset+=len;
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
