
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

function LegacyDBType(type_id) {
    return DBType_Map[type_id];
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
