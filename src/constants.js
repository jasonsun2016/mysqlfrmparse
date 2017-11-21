
var DBType_Map = {
    0 : 'UNKNOWN',
    1 : 'DIAB_ISAM',
    2 : 'HASH',
    3 : 'MISAM',
    4 : 'PISAM',
    5 : 'RMS_ISAM',
    6 : 'HEAP',
    7 : 'ISAM',
    8 : 'MRG_ISAM',
    9 : 'MyISAM',
    10 : 'MRG_MYISAM',
    11 : 'BERKELEYDB',
    12 : 'InnoDB',
    13 : 'GEMINI',
    14 : 'NDBCLUSTER',
    15 : 'EXAMPLE_DB',
    16 : 'ARCHIVE_DB',
    17 : 'CSV',
    18 : 'FEDERATED',
    19 : 'BLACKHOLE',
    20 : 'PARTITION_DB',
    21 : 'BINLOG',
    22 : 'SOLID',
    23 : 'PBXT',
    24 : 'TABLE_FUNCTION',
    25 : 'MEMCACHE',
    26 : 'FALCON',
    27 : 'MARIA',
    28 : 'PERFORMANCE_SCHEMA',
    42 : 'FIRST_DYNAMIC',
    127 : 'DEFAULT'
};

var CONST_VALUE = {
    PACK_SHIFT : 3,
    DEC_SHIFT : 8,
    MAX_DEC : 31,
    NUM_SCREEN_TYPE : 0X7F01,
    ALFA_SCREEN_TYPE : 0X7800
};

function LegacyDBType(type_id) {
    return DBType_Map[type_id];
}

function Utype(type_id) {   
    var utype_map = {
        0 : 'NONE',
        1 : 'DATE',
        2 : 'SHIELD',
        3 : 'NOEMPTY',
        4 : 'CASEUP',
        5 : 'PNR',
        6 : 'BGNR',
        7 : 'PGNR',
        8 : 'YES',
        9 : 'NO',
        10 : 'REL',
        11 : 'CHECK',
        12 : 'EMPTY',
        13 : 'UNKNOWN_FIELD',
        14 : 'CASEDN',
        15 : 'NEXT_NUMBER',
        16 : 'INTERVAL_FIELD',
        17 : 'BIT_FIELD',
        18 : 'TIMESTAMP_OLD_FIELD',
        19 : 'CAPITALIZE',
        20 : 'BLOB_FIELD',
        21 : 'TIMESTAMP_DN_FIELD',
        22 : 'TIMESTAMP_UN_FIELD',
        23 : 'TIMESTAMP_DNUN_FIELD'
    };
    return utype_map[type_id];
}


// include/mysql_com.h
// enum enum_field_types { ... };
function MySQLType(type_id) {
    var MySQLType_map = {
        0 : 'DECIMAL',
        1 : 'TINY',
        2 : 'SHORT',
        3 : 'LONG',
        4 : 'FLOAT',
        5 : 'DOUBLE',
        6 : 'NULL',
        7 : 'TIMESTAMP',
        8 : 'LONGLONG',
        9 : 'INT24',
        10 : 'DATE',
        11 : 'TIME',
        12 : 'DATETIME',
        13 : 'YEAR',
        14 : 'NEWDATE',
        15 : 'VARCHAR',
        16 : 'BIT',
        17 : 'TIMESTAMP2',
        18 : 'DATETIME2',
        19 : 'TIME2',
        246 : 'NEWDECIMAL',
        247 : 'ENUM',
        248 : 'SET',
        249 : 'TINY_BLOB',
        250 : 'MEDIUM_BLOB',
        251 : 'LONG_BLOB',
        252 : 'BLOB',
        253 : 'VAR_STRING',
        254 : 'STRING',
        255 : 'GEOMETRY'
    };
    return MySQLType_map[type_id];
}

function GeometryType(subtype_code) {
    var GeometryType_map = {
        0 : 'GEOMETRY',
        1 : 'POINT',
        2 : 'LINESTRING',
        3 : 'POLYGON',
        4 : 'MULTIPOINT',
        5 : 'MULTILINESTRING',
        6 : 'MULTIPOLYGON',
        7 : 'GEOMETRYCOLLECTION'
    };
    return GeometryType_map[subtype_code];
}


function FieldFlag(flags) {
    var field_flag_bit = {
        DECIMAL : 1,
        BINARY : 1,
        NUMBER : 2,
        ZEROFILL : 4,
        PACK : 120,
        INTERVAL : 256,
        BITFIELD : 512,
        BLOB : 1024,
        GEOM : 2048,
        TREAT_BIT_AS_CHAR : 4096,
        // defined, but not used in modern MySQL
        // LEFT_FULLSCREEN : 8192,
        NO_DEFAULT : 16384,
        // defined, but not used in modern MySQL
        // FORMAT_NUMBER : 16384,
        // defined, but not used in modern MySQL
        // RIGHT_FULLSCREEN : 16385,
        // defined, but not used in modern MySQL
        // SUM : 32768,
        MAYBE_NULL : 32768,
        HEX_ESCAPE : 0x10000
    };
    return BitFlags(field_flag_bit, flags);
}


function HaOption(data) {
    var ha_option_bits = {
        PACK_RECORD : 1,
        PACK_KEYS : 2,
        COMPRESS_RECORD : 4,
        LONG_BLOB_PTR : 8,      /* new ISAM format */
        TMP_TABLE : 16,
        CHECKSUM : 32,
        DELAY_KEY_WRITE : 64,
        NO_PACK_KEYS : 128,    /* Reserved for MySQL */
        CREATE_FROM_ENGINE : 256,
        RELIES_ON_SQL_LAYER : 512,
        NULL_FIELDS : 1024,
        PAGE_CHECKSUM : 2048,
        /** STATS_PERSISTENT=1 has been specified in the SQL command (either
          CREATE or ALTER TABLE). Table and index statistics that are collected by
         the storage engine and used by the optimizer for query optimization will
         be stored on disk and will not change after a server restart. */
        STATS_PERSISTENT : 4096,
        /** STATS_PERSISTENT=0 has been specified in CREATE/ALTER TABLE.
            Statistics for the table will be wiped away on server shutdown and
            new ones recalculated after the server is started again. If none of
            HA_OPTION_STATS_PERSISTENT or HA_OPTION_NO_STATS_PERSISTENT is set,
            this means that the setting is not explicitly set at table level and
            the corresponding table will use whatever is the global server
            default. */
        NO_STATS_PERSISTENT : 8192,
        TEMP_COMPRESS_RECORD : 16384,   /* set by isamchk */
        READ_ONLY_DATA : 32768   /* Set by isamchk */
    };
    return BitFlags(ha_option_bits, data);
}

function BitFlags(meta_map, data) {
    return {
        meta: meta_map,
        value: data,
        has: function(name) {
            return this.value & this.meta[name];
        }
    };
}





var HaRowType_Map = {
    0 : 'DEFAULT',
    1 : 'FIXED',
    2 : 'DYNAMIC',
    3 : 'COMPRESSED',
    4 : 'REDUNDANT',
    5 : 'COMPACT',
    6 : 'UNKNOWN_6',
    7 : 'TOKUDB_UNCOMPRESSED',
    8 : 'TOKUDB_ZLIB',
    9 : 'TOKUDB_SNAPPY',
    10 : 'TOKUDB_QUICKLZ',
    11 : 'TOKUDB_LZMA',
    12 : 'TOKUDB_FAST',
    13 : 'TOKUDB_SMALL',
    14 : 'TOKUDB_DEFAULT',
    15 : 'UNKNOWN_15',
    16 : 'UNKNOWN_16',
    17 : 'UNKNOWN_17',
    18 : 'UNKNOWN_18'
};

function HaRowType(type) {
    var orig_name = HaRowType_Map[type];
    if (orig_name === 'TOKUDB_DEFAULT')
        return 'TOKUDB_ZLIB';
    else if (orig_name === 'TOKUDB_FAST')
        return 'TOKUDB_QUICKLZ';
    else if (orig_name === 'TOKUDB_SMALL')
        return 'TOKUDB_LZMA';
    else
        return orig_name;
}
