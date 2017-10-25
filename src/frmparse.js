var Files = Java.type("java.nio.file.Files");
var Paths = Java.type("java.nio.file.Paths");

function parse(path)
{
    var raw_data = Files.readAllBytes(Paths.get(path));
    var data = new Util(raw_data);
    var mysql_version = from_version_id(data.uint32_at(0x0033));
    
    print (mysql_version.format());
    
    // keyinfo section
    var keyinfo_offset = data.uint16_at(0x0006);
    var keyinfo_length = data.uint16_at(0x000e);
    
    if (keyinfo_length == 0xffff){
        keyinfo_length = data.uint32_at(0x002f);
    }
    //keyinfo = data.read_at(keyinfo_length, keyinfo_offset)
    
}



function Util(raw_data)
{
    return {
        data: Java.from(raw_data),
        
        uint32_at: function(pos) {
            var b = this.data.slice(pos, pos+4);
            return (this.to_unsigned(b[3]) << 24) + (this.to_unsigned(b[2]) << 16) + (this.to_unsigned(b[1]) << 8) + this.to_unsigned(b[0]);
        },
        
        uint16_at: function(pos) {
            var b = this.data.slice(pos, pos+2);
            return (this.to_unsigned(b[1]) << 8) + this.to_unsigned(b[0]);
        },

        to_unsigned: function(val) {
            return (val < 0) ? (val + 256): val;
        }
    }
}

function from_version_id(val) {
    return {
        major: parseInt((val / 10000)),
        minor: parseInt(((val % 1000) / 100)),
        release: (val % 100),
        format: function() {
            return this.major + "." + this.minor + "." + this.release;
        }
    }
}


//Test
parse("D:\\workspace\\translate_dbsake\\innodb_index_stats.frm");
