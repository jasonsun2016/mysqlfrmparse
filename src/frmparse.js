#
load('include.js');
load('util.js');
load('charsets.js');
load('constants.js');
load('mysqltypes.js');

function parse(path)
{
    var raw_data = Files.readAllBytes(Paths.get(path));
    var data = new DataUtil(Java.from(raw_data));
    var mysql_version = from_version_id(data.uint32_at(0x0033));
    
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
        extrainfo:new DataUtil(extrainfo),
        columns:column_data
    };
    
    var table = Table_from_data(data, packed_frm_data);
    var columns = unpack_columns(packed_frm_data.columns, table);
    print (JSON.stringify(columns));
}


function unpack_columns(packed_columns, table) {
    var names = unpack_column_names(packed_columns.names);
    var labels = unpack_column_labels(packed_columns.labels);
    
    var metadata = new DataUtil(packed_columns.metadata);
    var defaults = new DataUtil(packed_columns.defaults);
    var comments = new DataUtil(packed_columns.comments);

    var _null_bytes = defaults.read(parseInt((packed_columns.null_count + 1 + 7) / 8));
    var null_map = _null_bytes;
    var null_bit = (table.options.handler_options.has('PACK_RECORD'))? 0: 1;
    
    var context = {null_map: null_map,
                null_bit: null_bit,
                table: table};
    var fieldnr = 0;
    print(JSON.stringify(names));
    return names.map(function(name) {
        var newContext = mergeObject(context, {
            name: name,
            fieldnr: fieldnr,
            null_bit: null_bit,
            length: metadata.uint16_at_pos(3, OS.SEEK_CUR),
            flags: FieldFlag(metadata.uint16_at_pos(8, OS.SEEK_CUR)),
            unireg_check: Utype(metadata.uint8_at_pos(10, OS.SEEK_CUR)),
            type_code: MySQLType(metadata.uint8_at_pos(13, OS.SEEK_CUR)),
            labels: null
        });
        
        //# Point context at the relevant set of labels for the current column
        //# label_id start at 1 for valid labels but our python labels are std
        //# zero offset. So we subtract 1 to fix the impedance mismatch. If
        //# this goes negative, this is probably not an enum field
        if (['ENUM', 'SET'].indexOf(context.type_code) > 0) {
            var label_id = metadata.uint8_at_pos(12, OS.SEEK_CUR) - 1;
            newContext = mergeObject(newContext, {labels:labels[label_id]});
        }
        
        var defaults_offset = metadata.uint24_at_pos(5, OS.SEEK_CUR) - 1;
        var comment_length = metadata.uint16_at_pos(15, OS.SEEK_CUR);

        if (context.type_code !== 'GEOMETRY') {
            var charset_id = (metadata.uint8_at_pos(11, OS.SEEK_CUR) << 8) + metadata.uint8_at_pos(14, OS.SEEK_CUR);
            var subtype_code = 0;
        }
        else {
            charset_id = 63;  // charset 'binary'
            var subtype_code = metadata.uint8_at_pos(14, OS.SEEK_CUR);
            subtype_code = GeometryType(subtype_code);
        }
        
        var charset = charsets_lookup(charset_id);
        newContext = mergeObject(newContext, {subtype_code:subtype_code, charset:charset});
        metadata.skip(17);
        
        defaults.offset(defaults_offset);
        var default_val = mysqltypes_unpack_default(defaults, newContext);
        null_bit = newContext.null_bit;
        
        var comment = stringFromBytes(comments.read(comment_length));
        var attributes = [];  //??
        
        return {
            type: 'Column',
            name:name,
            length:newContext.length,
            type_code: newContext.type_code,
            type_name: mysqltypes_format_type(newContext),
            default: default_val,
            attributes: attributes,
            charset: charset,
            comment: comment};
    });
}

function unpack_column_names(names) {
    var arr = names.slice(1, -2);
    var start_pos = 0;
    var names_arr = [];
    while(start_pos < arr.length) {
        var end = arr.indexOf(255, start_pos);
        end = (end !== -1) ? end: arr.length;
        names_arr.push(stringFromBytes(arr.slice(start_pos, end)));
        start_pos = end + 1;
    }
    return names_arr;
}

function unpack_column_labels(labels) {
    var arr = labels.slice(0, -1);
    var start_pos = 0;
    var labels_arr = [];
    while(start_pos < arr.length) {
        var end = arr.indexOf(0, start_pos);
        end = (end !== -1) ? end: arr.length;
        var group = arr.slice(start_pos, end);
        group = group.slice(1,-1);
        var inner_start_pos = 0;
        var group_arr = [];
        while(inner_start_pos < group.lenth) {
            var inner_end = group.indexOf(255, inner_start_pos);
            inner_end = (inner_end !== -1) ? inner_end: group.length;
            group_arr.push(group.slice(inner_start_pos, inner_end));
            inner_start_pos = inner_end + 1;
        }
        labels_arr.push(group_arr);
        start_pos = end + 1;
    }
    return labels_arr;
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
    if (extrasize) {
        if (extrainfo.tell() < extrasize) {
            connection = extrainfo.bytes_prefix16();
            connection = stringFromBytes(connection);
        }
        if (extrainfo.tell() < extrasize) {
            engine = extrainfo.bytes_prefix16();
            engine = stringFromBytes(engine);
        }
        if (extrainfo.tell() < extrasize) {
            partition_info = extrainfo.bytes_prefix32();
            partition_info = stringFromBytes(partition_info);
        }
        extrainfo.skip(2);  // skip null + autopartition flag
    }
    
    if (!engine) {
        // legacy_db_type
        engine = LegacyDBType(data.uint8_at(0x0003));
    }
    else if (engine === 'partition') {
        // default_part_db_type
        // this is underlying storage engine of the partitioned table
        engine = LegacyDBType(data.uint8_at(0x003d));
    }
    
    return {
        type: 'table',
        name: name,
        mysql_version: mysql_version,
        charset: charset,
        options: {
            connection: connection,
            engine: engine,
            charset: charset,
            min_rows: min_rows,
            max_rows: max_rows,
            avg_row_length: avg_row_length,
            handler_options: handler_options,
            row_format: row_format,
            key_block_size: key_block_size,
            comment: '',
            partitions: partition_info
        },
        columns: [],
        keys: []
    };
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
