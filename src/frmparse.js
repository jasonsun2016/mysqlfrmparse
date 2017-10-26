var Files = Java.type("java.nio.file.Files");
var Paths = Java.type("java.nio.file.Paths");

function parse(path)
{
    var raw_data = Files.readAllBytes(Paths.get(path));
    var data = new Util(Java.from(raw_data));
    print (data.len());
    var mysql_version = from_version_id(data.uint32_at(0x0033));
    
    print (mysql_version.format());
    
    // keyinfo section
    var keyinfo_offset = data.uint16_at(0x0006);
    var keyinfo_length = data.uint16_at(0x000e);
    
    if (keyinfo_length == 0xffff){
        keyinfo_length = data.uint32_at(0x002f);
    }
    var keyinfo = data.read_at(keyinfo_length, keyinfo_offset);
    
    
    //column defualts section
    var defaults_offset = keyinfo_offset + keyinfo_length;
    var defaults_length = data.uint16_at(0x0010);
    var defaults = data.read_at(defaults_length, defaults_offset);
    
    // table extra / attributes section
    var extrainfo_offset = defaults_offset + defaults_length;
    var extrainfo_length = data.uint32_at(0x0037);
    var extrainfo = data.read_at(extrainfo_length, extrainfo_offset);
    
    // column info section offset / lengths
    var names_length = data.uint16_at(0x0004)
    var header_size = 64
    var forminfo_offset = data.uint32_at(header_size + names_length)
    var forminfo_length = 288
    
    // "screens" section immediately follows forminfo and
    // we wish to skip it
    var screens_length = data.uint16_at(forminfo_offset + 260);
    
    // Column
    var null_fields = data.uint16_at(forminfo_offset + 282)
    var column_count = data.uint16_at(forminfo_offset + 258)
    var names_length = data.uint16_at(forminfo_offset + 268)
    var labels_length = data.uint16_at(forminfo_offset + 274)
    var comments_length = data.uint16_at(forminfo_offset + 284)
    var metadata_offset = forminfo_offset + forminfo_length + screens_length
    var metadata_length = 17*column_count  // 17 bytes of metadata per column
    
    data.offset(metadata_offset);
    var column_data = {
            count: column_count,
            null_count: null_fields,
            metadata: data.read(metadata_length),
            names: data.read(names_length),
            labels: data.read(labels_length),
            comments: data.read(comments_length),
            defaults: defaults
    };
    
    var packed_frm_data = {
        mysql_version : mysql_version,
        path:path,
        keyinfo:keyinfo,
        defaults:defaults,
        extrainfo:new Util(extrainfo),
        columns:column_data
    };
    
    var table = Table_from_data(data, packed_frm_data);
    
    
    
}

function Table_from_data(data, context) {
    var extrainfo = context.extrainfo;
    var name = guessTableNameFromFileName(context.path);
    var charset = charsets_lookup(data.uint8_at(0x0026));
    var mysql_version = context.mysql_version;
    // various table options encoded in header
    var min_rows = data.uint32_at(0x0016);
    var max_rows = data.uint32_at(0x0012);
    var avg_row_length = data.uint32_at(0x0022);
    //constants.HaRowType(data.uint8_at(0x0028))
    var row_format = data.uint8_at(0x0028);
    var key_block_size = data.uint16_at(0x003e);
    //constants.HaOption(data.uint16_at(0x001e))
    var handler_options = data.uint16_at(0x001e);
    
    // items possibly derived from extra section
    var connection = null;
    var engine = null;
    var partition_info = null;
    
    var extrasize = extrainfo.len();
    print (extrasize);
    print (extrainfo.tell());
    
    if (extrasize) {
        if (extrainfo.tell() < extrasize) {
            connection = extrainfo.bytes_prefix16()
            connection = connection.decode('utf-8')
        }
        if (extrainfo.tell() < extrasize) {
            engine = extrainfo.bytes_prefix16()
            engine = engine.decode('utf-8')
        }
        if (extrainfo.tell() < extrasize) {
            partition_info = extrainfo.bytes_prefix32()
            partition_info = partition_info.decode('utf-8')
        }
        extrainfo.skip(2)  // skip null + autopartition flag
    }
}

function charsets_lookup(id) {
    return {
        //TODO
    }
}

function guessTableNameFromFileName(path) {
    var fileName = Paths.get(path).toFile().getName();
    return fileName.contains('.') ? fileName.substring(0, fileName.indexOf('.')) : fileName;
}



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
            return b.map(function(e){return this.to_unsigned(e)}, this);
        },
        
        offset: function(new_offset){
            this.current_offset = new_offset;
        },
        
        read: function(len) {
            var b = this.data.slice(this.current_offset, this.current_offset + len);
            this.current_offset += len;
            return b.map(function(e){return this.to_unsigned(e)}, this);
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
