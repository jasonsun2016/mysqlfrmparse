#
load('include.js');
load('util.js');
load('charsets.js');
load('constants.js');

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
    
    if (keyinfo_length === 0xffff){
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
    var names_length = data.uint16_at(0x0004);
    var header_size = 64;
    var forminfo_offset = data.uint32_at(header_size + names_length);
    var forminfo_length = 288;
    
    // "screens" section immediately follows forminfo and
    // we wish to skip it
    var screens_length = data.uint16_at(forminfo_offset + 260);
    
    // Column
    var null_fields = data.uint16_at(forminfo_offset + 282);
    var column_count = data.uint16_at(forminfo_offset + 258);
    var names_length = data.uint16_at(forminfo_offset + 268);
    var labels_length = data.uint16_at(forminfo_offset + 274);
    var comments_length = data.uint16_at(forminfo_offset + 284);
    var metadata_offset = forminfo_offset + forminfo_length + screens_length;
    var metadata_length = 17*column_count;  // 17 bytes of metadata per column
    
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
    var row_format = HaRowType(data.uint8_at(0x0028));
    var key_block_size = data.uint16_at(0x003e);
    var handler_options = HaOption(data.uint16_at(0x001e));
    
    // items possibly derived from extra section
    var connection = null;
    var engine = null;
    var partition_info = null;
    
    var extrasize = extrainfo.len();
    print (extrasize);
    print (extrainfo.tell());
    
    if (extrasize) {
        if (extrainfo.tell() < extrasize) {
            connection = extrainfo.bytes_prefix16();
            connection = connection.decode('utf-8');
        }
        if (extrainfo.tell() < extrasize) {
            engine = extrainfo.bytes_prefix16();
            engine = engine.decode('utf-8');
        }
        if (extrainfo.tell() < extrasize) {
            partition_info = extrainfo.bytes_prefix32();
            partition_info = partition_info.decode('utf-8');
        }
        extrainfo.skip(2);  // skip null + autopartition flag
    }
}

function guessTableNameFromFileName(path) {
    var fileName = Paths.get(path).toFile().getName();
    return fileName.contains('.') ? fileName.substring(0, fileName.indexOf('.')) : fileName;
}

function from_version_id(val) {
    return {
        major: parseInt((val / 10000)),
        minor: parseInt(((val % 1000) / 100)),
        release: (val % 100),
        format: function() {
            return this.major + "." + this.minor + "." + this.release;
        }
    };
}


//Test
parse("D:\\workspace\\translate_dbsake\\innodb_index_stats.frm");
