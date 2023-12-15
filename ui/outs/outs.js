import xGrip from '../grip/grip.js';

export default {
  template: /*html*/ `
    <div class="outs">
    <div v-for="out, out_idx in outs">
      <table class="outs-table"
        v-if="out.columns"
        :data-out_idx="out_idx">
        <!-- <caption class="outs-caption" v-text="out.status"></caption> -->
        <colgroup>
          <col class="outs-col"
            v-for="col, col_idx in out.columns"
            :data-selected="selected_out_idx == out_idx && col_idx == out.selected_col_idx || null"
            :style="{ width: col.width + 'px' }" />
          <!-- <col class="outs-col" /> -->
        </colgroup>
        <thead class="outs-head">
          <tr>
            <th class="outs-th"
              scope="col"
              v-for="col, col_idx in out.columns"
              :data-selected="selected_out_idx == out_idx && col_idx == out.selected_col_idx || null">
              <span class="outs-colh_name" v-text="col.name"></span>
              <span>&nbsp;</span>
              <span class="outs-colh_type" v-text="resolve_type(col.typeOid)"></span>
              <x-grip class="outs-colh_resizer"
                :x="col.width"
                v-on:drag="resize_col(out_idx, col_idx, $event.x)">
              </x-grip>
            </th>
            <!-- <th class="outs-th" scope="col"></th> -->
          </tr>
        </thead>
        <tbody class="outs-tbody"
          v-on:click="on_cell_click(out_idx, $event.target)">
          <tr class="outs-row"
            v-for="row, row_idx in out.rows"
            :data-row_idx="row_idx"
            :data-selected="is_row_selected(out_idx, row_idx) || null">
            <td class="outs-cell"
              v-for="val, col_idx in row"
              :data-col_type="out.columns[col_idx].typeOid"
              :data-col_idx="col_idx"
              :data-selected="is_row_selected(out_idx, row_idx) && out.selected_col_idx == col_idx || null"
              :data-null="val == null || null"
              v-text="val?.slice(0, 100)">
            </td>
            <!-- <td class="outs-cell"> </td> -->
          </tr>
        </tbody>
      </table>
      <div class="outs-status" v-text="out.status"></div>
    </div>
    </div>
  `,
  components: {
    xGrip,
  },
  mounted() {
    // TODO unlisten
    this.$root.$el.addEventListener('req_row_focus', this.on_row_navigate);
  },
  computed: {
    outs: vm => vm.$store.outs,
    selected_out_idx: vm => vm.$store.selected_out_idx,
    // selected_row_idx: vm => vm.$store.selected_row_idx,
  },
  methods: {
    // is_col_selected(out_idx, col_idx) {
    //   return this.$store.selected_out_idx == out_idx && this.$s
    // },
    is_row_selected(out_idx, row_idx) {
      return this.$store.selected_out_idx == out_idx && this.$store.selected_row_idx == row_idx;
    },
    resize_col(out_idx, col_idx, width) {
      this.$store.resize_col(out_idx, col_idx, Math.max(width, 50));
      // console.log(e);
    },
    resolve_type(type_oid) {
      switch (type_oid) {
        default: return type_oid;
        case 1034: return '_aclitem';	case 0: return '_aclitem[]';
        case 12440: return '_administrable_role_authorizations';	case 0: return '_administrable_role_authorizations[]';
        case 12435: return '_applicable_roles';	case 0: return '_applicable_roles[]';
        case 12444: return '_attributes';	case 0: return '_attributes[]';
        case 1561: return '_bit';	case 0: return '_bit[]';
        case 1000: return '_bool';	case 0: return '_bool[]';
        case 1020: return '_box';	case 0: return '_box[]';
        case 16424: return '_box2d';	case 0: return '_box2d[]';
        case 16428: return '_box2df';	case 0: return '_box2df[]';
        case 16420: return '_box3d';	case 0: return '_box3d[]';
        case 1014: return '_bpchar';	case 0: return '_bpchar[]';
        case 1001: return '_bytea';	case 0: return '_bytea[]';
        case 12418: return '_cardinal_number';	case 0: return '_cardinal_number[]';
        case 1002: return '_char';	case 0: return '_char[]';
        case 12421: return '_character_data';	case 0: return '_character_data[]';
        case 12449: return '_character_sets';	case 0: return '_character_sets[]';
        case 12454: return '_check_constraint_routine_usage';	case 0: return '_check_constraint_routine_usage[]';
        case 12459: return '_check_constraints';	case 0: return '_check_constraints[]';
        case 1012: return '_cid';	case 0: return '_cid[]';
        case 651: return '_cidr';	case 0: return '_cidr[]';
        case 719: return '_circle';	case 0: return '_circle[]';
        case 12469: return '_collation_character_set_applicability';	case 0: return '_collation_character_set_applicability[]';
        case 12464: return '_collations';	case 0: return '_collations[]';
        case 12474: return '_column_column_usage';	case 0: return '_column_column_usage[]';
        case 12479: return '_column_domain_usage';	case 0: return '_column_domain_usage[]';
        case 12702: return '_column_options';	case 0: return '_column_options[]';
        case 12484: return '_column_privileges';	case 0: return '_column_privileges[]';
        case 12489: return '_column_udt_usage';	case 0: return '_column_udt_usage[]';
        case 12494: return '_columns';	case 0: return '_columns[]';
        case 12499: return '_constraint_column_usage';	case 0: return '_constraint_column_usage[]';
        case 12504: return '_constraint_table_usage';	case 0: return '_constraint_table_usage[]';
        case 1263: return '_cstring';	case 0: return '_cstring[]';
        case 12687: return '_data_type_privileges';	case 0: return '_data_type_privileges[]';
        case 1182: return '_date';	case 0: return '_date[]';
        case 6155: return '_datemultirange';	case 0: return '_datemultirange[]';
        case 3913: return '_daterange';	case 0: return '_daterange[]';
        case 797642: return '_denormap';	case 797641: return '_denormap[]';
        case 12509: return '_domain_constraints';	case 0: return '_domain_constraints[]';
        case 12514: return '_domain_udt_usage';	case 0: return '_domain_udt_usage[]';
        case 12519: return '_domains';	case 0: return '_domains[]';
        case 12692: return '_element_types';	case 0: return '_element_types[]';
        case 12524: return '_enabled_roles';	case 0: return '_enabled_roles[]';
        case 797650: return '_esexport';	case 0: return '_esexport[]';
        case 17434: return '_feature';	case 0: return '_feature[]';
        case 1021: return '_float4';	case 0: return '_float4[]';
        case 1022: return '_float8';	case 0: return '_float8[]';
        case 12710: return '_foreign_data_wrapper_options';	case 0: return '_foreign_data_wrapper_options[]';
        case 12714: return '_foreign_data_wrappers';	case 0: return '_foreign_data_wrappers[]';
        case 12723: return '_foreign_server_options';	case 0: return '_foreign_server_options[]';
        case 12727: return '_foreign_servers';	case 0: return '_foreign_servers[]';
        case 12736: return '_foreign_table_options';	case 0: return '_foreign_table_options[]';
        case 12740: return '_foreign_tables';	case 0: return '_foreign_tables[]';
        case 17085: return '_geography';	case 0: return '_geography[]';
        case 17102: return '_geography_columns';	case 0: return '_geography_columns[]';
        case 16398: return '_geometry';	case 0: return '_geometry[]';
        case 17238: return '_geometry_columns';	case 0: return '_geometry_columns[]';
        case 16691: return '_geometry_dump';	case 0: return '_geometry_dump[]';
        case 16432: return '_gidx';	case 0: return '_gidx[]';
        case 3644: return '_gtsvector';	case 0: return '_gtsvector[]';
        case 1041: return '_inet';	case 0: return '_inet[]';
        case 12426: return '_information_schema_catalog_name';	case 0: return '_information_schema_catalog_name[]';
        case 1005: return '_int2';	case 0: return '_int2[]';
        case 1006: return '_int2vector';	case 0: return '_int2vector[]';
        case 1007: return '_int4';	case 0: return '_int4[]';
        case 6150: return '_int4multirange';	case 0: return '_int4multirange[]';
        case 3905: return '_int4range';	case 0: return '_int4range[]';
        case 1016: return '_int8';	case 0: return '_int8[]';
        case 6157: return '_int8multirange';	case 0: return '_int8multirange[]';
        case 3927: return '_int8range';	case 0: return '_int8range[]';
        case 1187: return '_interval';	case 0: return '_interval[]';
        case 199: return '_json';	case 0: return '_json[]';
        case 3807: return '_jsonb';	case 0: return '_jsonb[]';
        case 4073: return '_jsonpath';	case 0: return '_jsonpath[]';
        case 12528: return '_key_column_usage';	case 0: return '_key_column_usage[]';
        case 629: return '_line';	case 0: return '_line[]';
        case 1018: return '_lseg';	case 0: return '_lseg[]';
        case 1040: return '_macaddr';	case 0: return '_macaddr[]';
        case 775: return '_macaddr8';	case 0: return '_macaddr8[]';
        case 791: return '_money';	case 0: return '_money[]';
        case 1003: return '_name';	case 0: return '_name[]';
        case 1231: return '_numeric';	case 0: return '_numeric[]';
        case 6151: return '_nummultirange';	case 0: return '_nummultirange[]';
        case 3907: return '_numrange';	case 0: return '_numrange[]';
        case 1028: return '_oid';	case 0: return '_oid[]';
        case 1013: return '_oidvector';	case 0: return '_oidvector[]';
        case 12533: return '_parameters';	case 0: return '_parameters[]';
        case 1019: return '_path';	case 0: return '_path[]';
        case 10026: return '_pg_aggregate';	case 0: return '_pg_aggregate[]';
        case 10014: return '_pg_am';	case 0: return '_pg_am[]';
        case 10016: return '_pg_amop';	case 0: return '_pg_amop[]';
        case 10018: return '_pg_amproc';	case 0: return '_pg_amproc[]';
        case 10000: return '_pg_attrdef';	case 0: return '_pg_attrdef[]';
        case 270: return '_pg_attribute';	case 0: return '_pg_attribute[]';
        case 10058: return '_pg_auth_members';	case 0: return '_pg_auth_members[]';
        case 10057: return '_pg_authid';	case 0: return '_pg_authid[]';
        case 12086: return '_pg_available_extension_versions';	case 0: return '_pg_available_extension_versions[]';
        case 12082: return '_pg_available_extensions';	case 0: return '_pg_available_extensions[]';
        case 12139: return '_pg_backend_memory_contexts';	case 0: return '_pg_backend_memory_contexts[]';
        case 10042: return '_pg_cast';	case 0: return '_pg_cast[]';
        case 273: return '_pg_class';	case 0: return '_pg_class[]';
        case 10094: return '_pg_collation';	case 0: return '_pg_collation[]';
        case 12131: return '_pg_config';	case 0: return '_pg_config[]';
        case 10002: return '_pg_constraint';	case 0: return '_pg_constraint[]';
        case 10048: return '_pg_conversion';	case 0: return '_pg_conversion[]';
        case 12078: return '_pg_cursors';	case 0: return '_pg_cursors[]';
        case 10052: return '_pg_database';	case 0: return '_pg_database[]';
        case 10053: return '_pg_db_role_setting';	case 0: return '_pg_db_role_setting[]';
        case 10087: return '_pg_default_acl';	case 0: return '_pg_default_acl[]';
        case 10050: return '_pg_depend';	case 0: return '_pg_depend[]';
        case 10040: return '_pg_description';	case 0: return '_pg_description[]';
        case 10044: return '_pg_enum';	case 0: return '_pg_enum[]';
        case 10038: return '_pg_event_trigger';	case 0: return '_pg_event_trigger[]';
        case 10073: return '_pg_extension';	case 0: return '_pg_extension[]';
        case 12111: return '_pg_file_settings';	case 0: return '_pg_file_settings[]';
        case 10075: return '_pg_foreign_data_wrapper';	case 0: return '_pg_foreign_data_wrapper[]';
        case 12707: return '_pg_foreign_data_wrappers';	case 12706: return '_pg_foreign_data_wrappers[]';
        case 10077: return '_pg_foreign_server';	case 0: return '_pg_foreign_server[]';
        case 12719: return '_pg_foreign_servers';	case 12718: return '_pg_foreign_servers[]';
        case 10081: return '_pg_foreign_table';	case 0: return '_pg_foreign_table[]';
        case 12698: return '_pg_foreign_table_columns';	case 12697: return '_pg_foreign_table_columns[]';
        case 12732: return '_pg_foreign_tables';	case 12731: return '_pg_foreign_tables[]';
        case 12011: return '_pg_group';	case 0: return '_pg_group[]';
        case 12115: return '_pg_hba_file_rules';	case 0: return '_pg_hba_file_rules[]';
        case 12119: return '_pg_ident_file_mappings';	case 0: return '_pg_ident_file_mappings[]';
        case 10006: return '_pg_index';	case 0: return '_pg_index[]';
        case 12044: return '_pg_indexes';	case 0: return '_pg_indexes[]';
        case 10004: return '_pg_inherits';	case 0: return '_pg_inherits[]';
        case 10089: return '_pg_init_privs';	case 0: return '_pg_init_privs[]';
        case 10020: return '_pg_language';	case 0: return '_pg_language[]';
        case 10024: return '_pg_largeobject';	case 0: return '_pg_largeobject[]';
        case 10022: return '_pg_largeobject_metadata';	case 0: return '_pg_largeobject_metadata[]';
        case 12074: return '_pg_locks';	case 0: return '_pg_locks[]';
        case 3221: return '_pg_lsn';	case 0: return '_pg_lsn[]';
        case 12039: return '_pg_matviews';	case 0: return '_pg_matviews[]';
        case 10046: return '_pg_namespace';	case 0: return '_pg_namespace[]';
        case 10012: return '_pg_opclass';	case 0: return '_pg_opclass[]';
        case 10008: return '_pg_operator';	case 0: return '_pg_operator[]';
        case 10010: return '_pg_opfamily';	case 0: return '_pg_opfamily[]';
        case 10096: return '_pg_parameter_acl';	case 0: return '_pg_parameter_acl[]';
        case 10098: return '_pg_partitioned_table';	case 0: return '_pg_partitioned_table[]';
        case 12019: return '_pg_policies';	case 0: return '_pg_policies[]';
        case 10083: return '_pg_policy';	case 0: return '_pg_policy[]';
        case 12096: return '_pg_prepared_statements';	case 0: return '_pg_prepared_statements[]';
        case 12091: return '_pg_prepared_xacts';	case 0: return '_pg_prepared_xacts[]';
        case 272: return '_pg_proc';	case 0: return '_pg_proc[]';
        case 10106: return '_pg_publication';	case 0: return '_pg_publication[]';
        case 10108: return '_pg_publication_namespace';	case 0: return '_pg_publication_namespace[]';
        case 10110: return '_pg_publication_rel';	case 0: return '_pg_publication_rel[]';
        case 12069: return '_pg_publication_tables';	case 0: return '_pg_publication_tables[]';
        case 10100: return '_pg_range';	case 0: return '_pg_range[]';
        case 10085: return '_pg_replication_origin';	case 0: return '_pg_replication_origin[]';
        case 12333: return '_pg_replication_origin_status';	case 0: return '_pg_replication_origin_status[]';
        case 12258: return '_pg_replication_slots';	case 0: return '_pg_replication_slots[]';
        case 10034: return '_pg_rewrite';	case 0: return '_pg_rewrite[]';
        case 12001: return '_pg_roles';	case 0: return '_pg_roles[]';
        case 12024: return '_pg_rules';	case 0: return '_pg_rules[]';
        case 10091: return '_pg_seclabel';	case 0: return '_pg_seclabel[]';
        case 12100: return '_pg_seclabels';	case 0: return '_pg_seclabels[]';
        case 10104: return '_pg_sequence';	case 0: return '_pg_sequence[]';
        case 12049: return '_pg_sequences';	case 0: return '_pg_sequences[]';
        case 12105: return '_pg_settings';	case 0: return '_pg_settings[]';
        case 12006: return '_pg_shadow';	case 0: return '_pg_shadow[]';
        case 10059: return '_pg_shdepend';	case 0: return '_pg_shdepend[]';
        case 10061: return '_pg_shdescription';	case 0: return '_pg_shdescription[]';
        case 12135: return '_pg_shmem_allocations';	case 0: return '_pg_shmem_allocations[]';
        case 10093: return '_pg_shseclabel';	case 0: return '_pg_shseclabel[]';
        case 5039: return '_pg_snapshot';	case 0: return '_pg_snapshot[]';
        case 12223: return '_pg_stat_activity';	case 0: return '_pg_stat_activity[]';
        case 12184: return '_pg_stat_all_indexes';	case 0: return '_pg_stat_all_indexes[]';
        case 12143: return '_pg_stat_all_tables';	case 0: return '_pg_stat_all_tables[]';
        case 12286: return '_pg_stat_archiver';	case 0: return '_pg_stat_archiver[]';
        case 12290: return '_pg_stat_bgwriter';	case 0: return '_pg_stat_bgwriter[]';
        case 12267: return '_pg_stat_database';	case 0: return '_pg_stat_database[]';
        case 12272: return '_pg_stat_database_conflicts';	case 0: return '_pg_stat_database_conflicts[]';
        case 12254: return '_pg_stat_gssapi';	case 0: return '_pg_stat_gssapi[]';
        case 12298: return '_pg_stat_progress_analyze';	case 0: return '_pg_stat_progress_analyze[]';
        case 12318: return '_pg_stat_progress_basebackup';	case 0: return '_pg_stat_progress_basebackup[]';
        case 12308: return '_pg_stat_progress_cluster';	case 0: return '_pg_stat_progress_cluster[]';
        case 12323: return '_pg_stat_progress_copy';	case 0: return '_pg_stat_progress_copy[]';
        case 12313: return '_pg_stat_progress_create_index';	case 0: return '_pg_stat_progress_create_index[]';
        case 12303: return '_pg_stat_progress_vacuum';	case 0: return '_pg_stat_progress_vacuum[]';
        case 12241: return '_pg_stat_recovery_prefetch';	case 0: return '_pg_stat_recovery_prefetch[]';
        case 12228: return '_pg_stat_replication';	case 0: return '_pg_stat_replication[]';
        case 12263: return '_pg_stat_replication_slots';	case 0: return '_pg_stat_replication_slots[]';
        case 12233: return '_pg_stat_slru';	case 0: return '_pg_stat_slru[]';
        case 12250: return '_pg_stat_ssl';	case 0: return '_pg_stat_ssl[]';
        case 12245: return '_pg_stat_subscription';	case 0: return '_pg_stat_subscription[]';
        case 12337: return '_pg_stat_subscription_stats';	case 0: return '_pg_stat_subscription_stats[]';
        case 12189: return '_pg_stat_sys_indexes';	case 0: return '_pg_stat_sys_indexes[]';
        case 12153: return '_pg_stat_sys_tables';	case 0: return '_pg_stat_sys_tables[]';
        case 12276: return '_pg_stat_user_functions';	case 0: return '_pg_stat_user_functions[]';
        case 12193: return '_pg_stat_user_indexes';	case 0: return '_pg_stat_user_indexes[]';
        case 12162: return '_pg_stat_user_tables';	case 0: return '_pg_stat_user_tables[]';
        case 12294: return '_pg_stat_wal';	case 0: return '_pg_stat_wal[]';
        case 12237: return '_pg_stat_wal_receiver';	case 0: return '_pg_stat_wal_receiver[]';
        case 12148: return '_pg_stat_xact_all_tables';	case 0: return '_pg_stat_xact_all_tables[]';
        case 12158: return '_pg_stat_xact_sys_tables';	case 0: return '_pg_stat_xact_sys_tables[]';
        case 12281: return '_pg_stat_xact_user_functions';	case 0: return '_pg_stat_xact_user_functions[]';
        case 12167: return '_pg_stat_xact_user_tables';	case 0: return '_pg_stat_xact_user_tables[]';
        case 12197: return '_pg_statio_all_indexes';	case 0: return '_pg_statio_all_indexes[]';
        case 12210: return '_pg_statio_all_sequences';	case 0: return '_pg_statio_all_sequences[]';
        case 12171: return '_pg_statio_all_tables';	case 0: return '_pg_statio_all_tables[]';
        case 12202: return '_pg_statio_sys_indexes';	case 0: return '_pg_statio_sys_indexes[]';
        case 12215: return '_pg_statio_sys_sequences';	case 0: return '_pg_statio_sys_sequences[]';
        case 12176: return '_pg_statio_sys_tables';	case 0: return '_pg_statio_sys_tables[]';
        case 12206: return '_pg_statio_user_indexes';	case 0: return '_pg_statio_user_indexes[]';
        case 12219: return '_pg_statio_user_sequences';	case 0: return '_pg_statio_user_sequences[]';
        case 12180: return '_pg_statio_user_tables';	case 0: return '_pg_statio_user_tables[]';
        case 10028: return '_pg_statistic';	case 0: return '_pg_statistic[]';
        case 10030: return '_pg_statistic_ext';	case 0: return '_pg_statistic_ext[]';
        case 10032: return '_pg_statistic_ext_data';	case 0: return '_pg_statistic_ext_data[]';
        case 12054: return '_pg_stats';	case 0: return '_pg_stats[]';
        case 12059: return '_pg_stats_ext';	case 0: return '_pg_stats_ext[]';
        case 12064: return '_pg_stats_ext_exprs';	case 0: return '_pg_stats_ext_exprs[]';
        case 10112: return '_pg_subscription';	case 0: return '_pg_subscription[]';
        case 10113: return '_pg_subscription_rel';	case 0: return '_pg_subscription_rel[]';
        case 12034: return '_pg_tables';	case 0: return '_pg_tables[]';
        case 10055: return '_pg_tablespace';	case 0: return '_pg_tablespace[]';
        case 12123: return '_pg_timezone_abbrevs';	case 0: return '_pg_timezone_abbrevs[]';
        case 12127: return '_pg_timezone_names';	case 0: return '_pg_timezone_names[]';
        case 10102: return '_pg_transform';	case 0: return '_pg_transform[]';
        case 10036: return '_pg_trigger';	case 0: return '_pg_trigger[]';
        case 10063: return '_pg_ts_config';	case 0: return '_pg_ts_config[]';
        case 10065: return '_pg_ts_config_map';	case 0: return '_pg_ts_config_map[]';
        case 10067: return '_pg_ts_dict';	case 0: return '_pg_ts_dict[]';
        case 10069: return '_pg_ts_parser';	case 0: return '_pg_ts_parser[]';
        case 10071: return '_pg_ts_template';	case 0: return '_pg_ts_template[]';
        case 210: return '_pg_type';	case 0: return '_pg_type[]';
        case 12015: return '_pg_user';	case 0: return '_pg_user[]';
        case 10079: return '_pg_user_mapping';	case 0: return '_pg_user_mapping[]';
        case 12328: return '_pg_user_mappings';	case 0: return '_pg_user_mappings[]';
        case 12745: return '_pg_user_mappings';	case 12744: return '_pg_user_mappings[]';
        case 12029: return '_pg_views';	case 0: return '_pg_views[]';
        case 779568: return '_pgogen';	case 0: return '_pgogen[]';
        case 1017: return '_point';	case 0: return '_point[]';
        case 1027: return '_polygon';	case 0: return '_polygon[]';
        case 2287: return '_record';	case 0: return '_record[]';
        case 2201: return '_refcursor';	case 0: return '_refcursor[]';
        case 12538: return '_referential_constraints';	case 0: return '_referential_constraints[]';
        case 2210: return '_regclass';	case 0: return '_regclass[]';
        case 4192: return '_regcollation';	case 0: return '_regcollation[]';
        case 3735: return '_regconfig';	case 0: return '_regconfig[]';
        case 3770: return '_regdictionary';	case 0: return '_regdictionary[]';
        case 4090: return '_regnamespace';	case 0: return '_regnamespace[]';
        case 2208: return '_regoper';	case 0: return '_regoper[]';
        case 2209: return '_regoperator';	case 0: return '_regoperator[]';
        case 1008: return '_regproc';	case 0: return '_regproc[]';
        case 2207: return '_regprocedure';	case 0: return '_regprocedure[]';
        case 4097: return '_regrole';	case 0: return '_regrole[]';
        case 2211: return '_regtype';	case 0: return '_regtype[]';
        case 12543: return '_role_column_grants';	case 0: return '_role_column_grants[]';
        case 12557: return '_role_routine_grants';	case 0: return '_role_routine_grants[]';
        case 12620: return '_role_table_grants';	case 0: return '_role_table_grants[]';
        case 12649: return '_role_udt_grants';	case 0: return '_role_udt_grants[]';
        case 12658: return '_role_usage_grants';	case 0: return '_role_usage_grants[]';
        case 12547: return '_routine_column_usage';	case 0: return '_routine_column_usage[]';
        case 12552: return '_routine_privileges';	case 0: return '_routine_privileges[]';
        case 12561: return '_routine_routine_usage';	case 0: return '_routine_routine_usage[]';
        case 12566: return '_routine_sequence_usage';	case 0: return '_routine_sequence_usage[]';
        case 12571: return '_routine_table_usage';	case 0: return '_routine_table_usage[]';
        case 12576: return '_routines';	case 0: return '_routines[]';
        case 12581: return '_schemata';	case 0: return '_schemata[]';
        case 12585: return '_sequences';	case 0: return '_sequences[]';
        case 16698: return '_spatial_ref_sys';	case 0: return '_spatial_ref_sys[]';
        case 16389: return '_spheroid';	case 0: return '_spheroid[]';
        case 12590: return '_sql_features';	case 0: return '_sql_features[]';
        case 12423: return '_sql_identifier';	case 0: return '_sql_identifier[]';
        case 12595: return '_sql_implementation_info';	case 0: return '_sql_implementation_info[]';
        case 12600: return '_sql_parts';	case 0: return '_sql_parts[]';
        case 12605: return '_sql_sizing';	case 0: return '_sql_sizing[]';
        case 12610: return '_table_constraints';	case 0: return '_table_constraints[]';
        case 12615: return '_table_privileges';	case 0: return '_table_privileges[]';
        case 12624: return '_tables';	case 0: return '_tables[]';
        case 1009: return '_text';	case 0: return '_text[]';
        case 1010: return '_tid';	case 0: return '_tid[]';
        case 1183: return '_time';	case 0: return '_time[]';
        case 12429: return '_time_stamp';	case 0: return '_time_stamp[]';
        case 1115: return '_timestamp';	case 0: return '_timestamp[]';
        case 1185: return '_timestamptz';	case 0: return '_timestamptz[]';
        case 1270: return '_timetz';	case 0: return '_timetz[]';
        case 12629: return '_transforms';	case 0: return '_transforms[]';
        case 12634: return '_triggered_update_columns';	case 0: return '_triggered_update_columns[]';
        case 12639: return '_triggers';	case 0: return '_triggers[]';
        case 6152: return '_tsmultirange';	case 0: return '_tsmultirange[]';
        case 3645: return '_tsquery';	case 0: return '_tsquery[]';
        case 3909: return '_tsrange';	case 0: return '_tsrange[]';
        case 6153: return '_tstzmultirange';	case 0: return '_tstzmultirange[]';
        case 3911: return '_tstzrange';	case 0: return '_tstzrange[]';
        case 3643: return '_tsvector';	case 0: return '_tsvector[]';
        case 2949: return '_txid_snapshot';	case 0: return '_txid_snapshot[]';
        case 12644: return '_udt_privileges';	case 0: return '_udt_privileges[]';
        case 12653: return '_usage_privileges';	case 0: return '_usage_privileges[]';
        case 12662: return '_user_defined_types';	case 0: return '_user_defined_types[]';
        case 12749: return '_user_mapping_options';	case 0: return '_user_mapping_options[]';
        case 12754: return '_user_mappings';	case 0: return '_user_mappings[]';
        case 2951: return '_uuid';	case 0: return '_uuid[]';
        case 16807: return '_valid_detail';	case 0: return '_valid_detail[]';
        case 1563: return '_varbit';	case 0: return '_varbit[]';
        case 1015: return '_varchar';	case 0: return '_varchar[]';
        case 12667: return '_view_column_usage';	case 0: return '_view_column_usage[]';
        case 12672: return '_view_routine_usage';	case 0: return '_view_routine_usage[]';
        case 12677: return '_view_table_usage';	case 0: return '_view_table_usage[]';
        case 12682: return '_views';	case 0: return '_views[]';
        case 1011: return '_xid';	case 0: return '_xid[]';
        case 271: return '_xid8';	case 0: return '_xid8[]';
        case 143: return '_xml';	case 0: return '_xml[]';
        case 12431: return '_yes_or_no';	case 0: return '_yes_or_no[]';
        case 1033: return 'aclitem';	case 1034: return 'aclitem[]';
        case 12441: return 'administrable_role_authorizations';	case 12440: return 'administrable_role_authorizations[]';
        case 2276: return 'any';	case 0: return 'any[]';
        case 2277: return 'anyarray';	case 0: return 'anyarray[]';
        case 5077: return 'anycompatible';	case 0: return 'anycompatible[]';
        case 5078: return 'anycompatiblearray';	case 0: return 'anycompatiblearray[]';
        case 4538: return 'anycompatiblemultirange';	case 0: return 'anycompatiblemultirange[]';
        case 5079: return 'anycompatiblenonarray';	case 0: return 'anycompatiblenonarray[]';
        case 5080: return 'anycompatiblerange';	case 0: return 'anycompatiblerange[]';
        case 2283: return 'anyelement';	case 0: return 'anyelement[]';
        case 3500: return 'anyenum';	case 0: return 'anyenum[]';
        case 4537: return 'anymultirange';	case 0: return 'anymultirange[]';
        case 2776: return 'anynonarray';	case 0: return 'anynonarray[]';
        case 3831: return 'anyrange';	case 0: return 'anyrange[]';
        case 12436: return 'applicable_roles';	case 12435: return 'applicable_roles[]';
        case 12445: return 'attributes';	case 12444: return 'attributes[]';
        case 1560: return 'bit';	case 1561: return 'bit[]';
        case 16: return 'bool';	case 1000: return 'bool[]';
        case 603: return 'box';	case 1020: return 'box[]';
        case 16421: return 'box2d';	case 16424: return 'box2d[]';
        case 16425: return 'box2df';	case 16428: return 'box2df[]';
        case 16417: return 'box3d';	case 16420: return 'box3d[]';
        case 1042: return 'bpchar';	case 1014: return 'bpchar[]';
        case 17: return 'bytea';	case 1001: return 'bytea[]';
        case 12419: return 'cardinal_number';	case 12418: return 'cardinal_number[]';
        case 18: return 'char';	case 1002: return 'char[]';
        case 12422: return 'character_data';	case 12421: return 'character_data[]';
        case 12450: return 'character_sets';	case 12449: return 'character_sets[]';
        case 12455: return 'check_constraint_routine_usage';	case 12454: return 'check_constraint_routine_usage[]';
        case 12460: return 'check_constraints';	case 12459: return 'check_constraints[]';
        case 29: return 'cid';	case 1012: return 'cid[]';
        case 650: return 'cidr';	case 651: return 'cidr[]';
        case 718: return 'circle';	case 719: return 'circle[]';
        case 12470: return 'collation_character_set_applicability';	case 12469: return 'collation_character_set_applicability[]';
        case 12465: return 'collations';	case 12464: return 'collations[]';
        case 12475: return 'column_column_usage';	case 12474: return 'column_column_usage[]';
        case 12480: return 'column_domain_usage';	case 12479: return 'column_domain_usage[]';
        case 12703: return 'column_options';	case 12702: return 'column_options[]';
        case 12485: return 'column_privileges';	case 12484: return 'column_privileges[]';
        case 12490: return 'column_udt_usage';	case 12489: return 'column_udt_usage[]';
        case 12495: return 'columns';	case 12494: return 'columns[]';
        case 12500: return 'constraint_column_usage';	case 12499: return 'constraint_column_usage[]';
        case 12505: return 'constraint_table_usage';	case 12504: return 'constraint_table_usage[]';
        case 2275: return 'cstring';	case 1263: return 'cstring[]';
        case 12688: return 'data_type_privileges';	case 12687: return 'data_type_privileges[]';
        case 1082: return 'date';	case 1182: return 'date[]';
        case 4535: return 'datemultirange';	case 6155: return 'datemultirange[]';
        case 3912: return 'daterange';	case 3913: return 'daterange[]';
        case 12510: return 'domain_constraints';	case 12509: return 'domain_constraints[]';
        case 12515: return 'domain_udt_usage';	case 12514: return 'domain_udt_usage[]';
        case 12520: return 'domains';	case 12519: return 'domains[]';
        case 12693: return 'element_types';	case 12692: return 'element_types[]';
        case 12525: return 'enabled_roles';	case 12524: return 'enabled_roles[]';
        case 797651: return 'esexport';	case 797650: return 'esexport[]';
        case 3838: return 'event_trigger';	case 0: return 'event_trigger[]';
        case 3115: return 'fdw_handler';	case 0: return 'fdw_handler[]';
        case 17435: return 'feature';	case 17434: return 'feature[]';
        case 700: return 'float4';	case 1021: return 'float4[]';
        case 701: return 'float8';	case 1022: return 'float8[]';
        case 12711: return 'foreign_data_wrapper_options';	case 12710: return 'foreign_data_wrapper_options[]';
        case 12715: return 'foreign_data_wrappers';	case 12714: return 'foreign_data_wrappers[]';
        case 12724: return 'foreign_server_options';	case 12723: return 'foreign_server_options[]';
        case 12728: return 'foreign_servers';	case 12727: return 'foreign_servers[]';
        case 12737: return 'foreign_table_options';	case 12736: return 'foreign_table_options[]';
        case 12741: return 'foreign_tables';	case 12740: return 'foreign_tables[]';
        case 17079: return 'geography';	case 17085: return 'geography[]';
        case 17103: return 'geography_columns';	case 17102: return 'geography_columns[]';
        case 16390: return 'geometry';	case 16398: return 'geometry[]';
        case 17239: return 'geometry_columns';	case 17238: return 'geometry_columns[]';
        case 16692: return 'geometry_dump';	case 16691: return 'geometry_dump[]';
        case 16429: return 'gidx';	case 16432: return 'gidx[]';
        case 3642: return 'gtsvector';	case 3644: return 'gtsvector[]';
        case 325: return 'index_am_handler';	case 0: return 'index_am_handler[]';
        case 869: return 'inet';	case 1041: return 'inet[]';
        case 12427: return 'information_schema_catalog_name';	case 12426: return 'information_schema_catalog_name[]';
        case 21: return 'int2';	case 1005: return 'int2[]';
        case 22: return 'int2vector';	case 1006: return 'int2vector[]';
        case 23: return 'int4';	case 1007: return 'int4[]';
        case 4451: return 'int4multirange';	case 6150: return 'int4multirange[]';
        case 3904: return 'int4range';	case 3905: return 'int4range[]';
        case 20: return 'int8';	case 1016: return 'int8[]';
        case 4536: return 'int8multirange';	case 6157: return 'int8multirange[]';
        case 3926: return 'int8range';	case 3927: return 'int8range[]';
        case 2281: return 'internal';	case 0: return 'internal[]';
        case 1186: return 'interval';	case 1187: return 'interval[]';
        case 114: return 'json';	case 199: return 'json[]';
        case 3802: return 'jsonb';	case 3807: return 'jsonb[]';
        case 4072: return 'jsonpath';	case 4073: return 'jsonpath[]';
        case 12529: return 'key_column_usage';	case 12528: return 'key_column_usage[]';
        case 2280: return 'language_handler';	case 0: return 'language_handler[]';
        case 628: return 'line';	case 629: return 'line[]';
        case 601: return 'lseg';	case 1018: return 'lseg[]';
        case 829: return 'macaddr';	case 1040: return 'macaddr[]';
        case 774: return 'macaddr8';	case 775: return 'macaddr8[]';
        case 790: return 'money';	case 791: return 'money[]';
        case 19: return 'name';	case 1003: return 'name[]';
        case 1700: return 'numeric';	case 1231: return 'numeric[]';
        case 4532: return 'nummultirange';	case 6151: return 'nummultirange[]';
        case 3906: return 'numrange';	case 3907: return 'numrange[]';
        case 26: return 'oid';	case 1028: return 'oid[]';
        case 30: return 'oidvector';	case 1013: return 'oidvector[]';
        case 12534: return 'parameters';	case 12533: return 'parameters[]';
        case 602: return 'path';	case 1019: return 'path[]';
        case 10027: return 'pg_aggregate';	case 10026: return 'pg_aggregate[]';
        case 10015: return 'pg_am';	case 10014: return 'pg_am[]';
        case 10017: return 'pg_amop';	case 10016: return 'pg_amop[]';
        case 10019: return 'pg_amproc';	case 10018: return 'pg_amproc[]';
        case 10001: return 'pg_attrdef';	case 10000: return 'pg_attrdef[]';
        case 75: return 'pg_attribute';	case 270: return 'pg_attribute[]';
        case 2843: return 'pg_auth_members';	case 10058: return 'pg_auth_members[]';
        case 2842: return 'pg_authid';	case 10057: return 'pg_authid[]';
        case 12087: return 'pg_available_extension_versions';	case 12086: return 'pg_available_extension_versions[]';
        case 12083: return 'pg_available_extensions';	case 12082: return 'pg_available_extensions[]';
        case 12140: return 'pg_backend_memory_contexts';	case 12139: return 'pg_backend_memory_contexts[]';
        case 4600: return 'pg_brin_bloom_summary';	case 0: return 'pg_brin_bloom_summary[]';
        case 4601: return 'pg_brin_minmax_multi_summary';	case 0: return 'pg_brin_minmax_multi_summary[]';
        case 10043: return 'pg_cast';	case 10042: return 'pg_cast[]';
        case 83: return 'pg_class';	case 273: return 'pg_class[]';
        case 10095: return 'pg_collation';	case 10094: return 'pg_collation[]';
        case 12132: return 'pg_config';	case 12131: return 'pg_config[]';
        case 10003: return 'pg_constraint';	case 10002: return 'pg_constraint[]';
        case 10049: return 'pg_conversion';	case 10048: return 'pg_conversion[]';
        case 12079: return 'pg_cursors';	case 12078: return 'pg_cursors[]';
        case 1248: return 'pg_database';	case 10052: return 'pg_database[]';
        case 10054: return 'pg_db_role_setting';	case 10053: return 'pg_db_role_setting[]';
        case 32: return 'pg_ddl_command';	case 0: return 'pg_ddl_command[]';
        case 10088: return 'pg_default_acl';	case 10087: return 'pg_default_acl[]';
        case 10051: return 'pg_depend';	case 10050: return 'pg_depend[]';
        case 3402: return 'pg_dependencies';	case 0: return 'pg_dependencies[]';
        case 10041: return 'pg_description';	case 10040: return 'pg_description[]';
        case 10045: return 'pg_enum';	case 10044: return 'pg_enum[]';
        case 10039: return 'pg_event_trigger';	case 10038: return 'pg_event_trigger[]';
        case 10074: return 'pg_extension';	case 10073: return 'pg_extension[]';
        case 12112: return 'pg_file_settings';	case 12111: return 'pg_file_settings[]';
        case 10076: return 'pg_foreign_data_wrapper';	case 10075: return 'pg_foreign_data_wrapper[]';
        case 10078: return 'pg_foreign_server';	case 10077: return 'pg_foreign_server[]';
        case 10082: return 'pg_foreign_table';	case 10081: return 'pg_foreign_table[]';
        case 12012: return 'pg_group';	case 12011: return 'pg_group[]';
        case 12116: return 'pg_hba_file_rules';	case 12115: return 'pg_hba_file_rules[]';
        case 12120: return 'pg_ident_file_mappings';	case 12119: return 'pg_ident_file_mappings[]';
        case 10007: return 'pg_index';	case 10006: return 'pg_index[]';
        case 12045: return 'pg_indexes';	case 12044: return 'pg_indexes[]';
        case 10005: return 'pg_inherits';	case 10004: return 'pg_inherits[]';
        case 10090: return 'pg_init_privs';	case 10089: return 'pg_init_privs[]';
        case 10021: return 'pg_language';	case 10020: return 'pg_language[]';
        case 10025: return 'pg_largeobject';	case 10024: return 'pg_largeobject[]';
        case 10023: return 'pg_largeobject_metadata';	case 10022: return 'pg_largeobject_metadata[]';
        case 12075: return 'pg_locks';	case 12074: return 'pg_locks[]';
        case 3220: return 'pg_lsn';	case 3221: return 'pg_lsn[]';
        case 12040: return 'pg_matviews';	case 12039: return 'pg_matviews[]';
        case 5017: return 'pg_mcv_list';	case 0: return 'pg_mcv_list[]';
        case 10047: return 'pg_namespace';	case 10046: return 'pg_namespace[]';
        case 3361: return 'pg_ndistinct';	case 0: return 'pg_ndistinct[]';
        case 194: return 'pg_node_tree';	case 0: return 'pg_node_tree[]';
        case 10013: return 'pg_opclass';	case 10012: return 'pg_opclass[]';
        case 10009: return 'pg_operator';	case 10008: return 'pg_operator[]';
        case 10011: return 'pg_opfamily';	case 10010: return 'pg_opfamily[]';
        case 10097: return 'pg_parameter_acl';	case 10096: return 'pg_parameter_acl[]';
        case 10099: return 'pg_partitioned_table';	case 10098: return 'pg_partitioned_table[]';
        case 12020: return 'pg_policies';	case 12019: return 'pg_policies[]';
        case 10084: return 'pg_policy';	case 10083: return 'pg_policy[]';
        case 12097: return 'pg_prepared_statements';	case 12096: return 'pg_prepared_statements[]';
        case 12092: return 'pg_prepared_xacts';	case 12091: return 'pg_prepared_xacts[]';
        case 81: return 'pg_proc';	case 272: return 'pg_proc[]';
        case 10107: return 'pg_publication';	case 10106: return 'pg_publication[]';
        case 10109: return 'pg_publication_namespace';	case 10108: return 'pg_publication_namespace[]';
        case 10111: return 'pg_publication_rel';	case 10110: return 'pg_publication_rel[]';
        case 12070: return 'pg_publication_tables';	case 12069: return 'pg_publication_tables[]';
        case 10101: return 'pg_range';	case 10100: return 'pg_range[]';
        case 10086: return 'pg_replication_origin';	case 10085: return 'pg_replication_origin[]';
        case 12334: return 'pg_replication_origin_status';	case 12333: return 'pg_replication_origin_status[]';
        case 12259: return 'pg_replication_slots';	case 12258: return 'pg_replication_slots[]';
        case 10035: return 'pg_rewrite';	case 10034: return 'pg_rewrite[]';
        case 12002: return 'pg_roles';	case 12001: return 'pg_roles[]';
        case 12025: return 'pg_rules';	case 12024: return 'pg_rules[]';
        case 10092: return 'pg_seclabel';	case 10091: return 'pg_seclabel[]';
        case 12101: return 'pg_seclabels';	case 12100: return 'pg_seclabels[]';
        case 10105: return 'pg_sequence';	case 10104: return 'pg_sequence[]';
        case 12050: return 'pg_sequences';	case 12049: return 'pg_sequences[]';
        case 12106: return 'pg_settings';	case 12105: return 'pg_settings[]';
        case 12007: return 'pg_shadow';	case 12006: return 'pg_shadow[]';
        case 10060: return 'pg_shdepend';	case 10059: return 'pg_shdepend[]';
        case 10062: return 'pg_shdescription';	case 10061: return 'pg_shdescription[]';
        case 12136: return 'pg_shmem_allocations';	case 12135: return 'pg_shmem_allocations[]';
        case 4066: return 'pg_shseclabel';	case 10093: return 'pg_shseclabel[]';
        case 5038: return 'pg_snapshot';	case 5039: return 'pg_snapshot[]';
        case 12224: return 'pg_stat_activity';	case 12223: return 'pg_stat_activity[]';
        case 12185: return 'pg_stat_all_indexes';	case 12184: return 'pg_stat_all_indexes[]';
        case 12144: return 'pg_stat_all_tables';	case 12143: return 'pg_stat_all_tables[]';
        case 12287: return 'pg_stat_archiver';	case 12286: return 'pg_stat_archiver[]';
        case 12291: return 'pg_stat_bgwriter';	case 12290: return 'pg_stat_bgwriter[]';
        case 12268: return 'pg_stat_database';	case 12267: return 'pg_stat_database[]';
        case 12273: return 'pg_stat_database_conflicts';	case 12272: return 'pg_stat_database_conflicts[]';
        case 12255: return 'pg_stat_gssapi';	case 12254: return 'pg_stat_gssapi[]';
        case 12299: return 'pg_stat_progress_analyze';	case 12298: return 'pg_stat_progress_analyze[]';
        case 12319: return 'pg_stat_progress_basebackup';	case 12318: return 'pg_stat_progress_basebackup[]';
        case 12309: return 'pg_stat_progress_cluster';	case 12308: return 'pg_stat_progress_cluster[]';
        case 12324: return 'pg_stat_progress_copy';	case 12323: return 'pg_stat_progress_copy[]';
        case 12314: return 'pg_stat_progress_create_index';	case 12313: return 'pg_stat_progress_create_index[]';
        case 12304: return 'pg_stat_progress_vacuum';	case 12303: return 'pg_stat_progress_vacuum[]';
        case 12242: return 'pg_stat_recovery_prefetch';	case 12241: return 'pg_stat_recovery_prefetch[]';
        case 12229: return 'pg_stat_replication';	case 12228: return 'pg_stat_replication[]';
        case 12264: return 'pg_stat_replication_slots';	case 12263: return 'pg_stat_replication_slots[]';
        case 12234: return 'pg_stat_slru';	case 12233: return 'pg_stat_slru[]';
        case 12251: return 'pg_stat_ssl';	case 12250: return 'pg_stat_ssl[]';
        case 12246: return 'pg_stat_subscription';	case 12245: return 'pg_stat_subscription[]';
        case 12338: return 'pg_stat_subscription_stats';	case 12337: return 'pg_stat_subscription_stats[]';
        case 12190: return 'pg_stat_sys_indexes';	case 12189: return 'pg_stat_sys_indexes[]';
        case 12154: return 'pg_stat_sys_tables';	case 12153: return 'pg_stat_sys_tables[]';
        case 12277: return 'pg_stat_user_functions';	case 12276: return 'pg_stat_user_functions[]';
        case 12194: return 'pg_stat_user_indexes';	case 12193: return 'pg_stat_user_indexes[]';
        case 12163: return 'pg_stat_user_tables';	case 12162: return 'pg_stat_user_tables[]';
        case 12295: return 'pg_stat_wal';	case 12294: return 'pg_stat_wal[]';
        case 12238: return 'pg_stat_wal_receiver';	case 12237: return 'pg_stat_wal_receiver[]';
        case 12149: return 'pg_stat_xact_all_tables';	case 12148: return 'pg_stat_xact_all_tables[]';
        case 12159: return 'pg_stat_xact_sys_tables';	case 12158: return 'pg_stat_xact_sys_tables[]';
        case 12282: return 'pg_stat_xact_user_functions';	case 12281: return 'pg_stat_xact_user_functions[]';
        case 12168: return 'pg_stat_xact_user_tables';	case 12167: return 'pg_stat_xact_user_tables[]';
        case 12198: return 'pg_statio_all_indexes';	case 12197: return 'pg_statio_all_indexes[]';
        case 12211: return 'pg_statio_all_sequences';	case 12210: return 'pg_statio_all_sequences[]';
        case 12172: return 'pg_statio_all_tables';	case 12171: return 'pg_statio_all_tables[]';
        case 12203: return 'pg_statio_sys_indexes';	case 12202: return 'pg_statio_sys_indexes[]';
        case 12216: return 'pg_statio_sys_sequences';	case 12215: return 'pg_statio_sys_sequences[]';
        case 12177: return 'pg_statio_sys_tables';	case 12176: return 'pg_statio_sys_tables[]';
        case 12207: return 'pg_statio_user_indexes';	case 12206: return 'pg_statio_user_indexes[]';
        case 12220: return 'pg_statio_user_sequences';	case 12219: return 'pg_statio_user_sequences[]';
        case 12181: return 'pg_statio_user_tables';	case 12180: return 'pg_statio_user_tables[]';
        case 10029: return 'pg_statistic';	case 10028: return 'pg_statistic[]';
        case 10031: return 'pg_statistic_ext';	case 10030: return 'pg_statistic_ext[]';
        case 10033: return 'pg_statistic_ext_data';	case 10032: return 'pg_statistic_ext_data[]';
        case 12055: return 'pg_stats';	case 12054: return 'pg_stats[]';
        case 12060: return 'pg_stats_ext';	case 12059: return 'pg_stats_ext[]';
        case 12065: return 'pg_stats_ext_exprs';	case 12064: return 'pg_stats_ext_exprs[]';
        case 6101: return 'pg_subscription';	case 10112: return 'pg_subscription[]';
        case 10114: return 'pg_subscription_rel';	case 10113: return 'pg_subscription_rel[]';
        case 12035: return 'pg_tables';	case 12034: return 'pg_tables[]';
        case 10056: return 'pg_tablespace';	case 10055: return 'pg_tablespace[]';
        case 12124: return 'pg_timezone_abbrevs';	case 12123: return 'pg_timezone_abbrevs[]';
        case 12128: return 'pg_timezone_names';	case 12127: return 'pg_timezone_names[]';
        case 10103: return 'pg_transform';	case 10102: return 'pg_transform[]';
        case 10037: return 'pg_trigger';	case 10036: return 'pg_trigger[]';
        case 10064: return 'pg_ts_config';	case 10063: return 'pg_ts_config[]';
        case 10066: return 'pg_ts_config_map';	case 10065: return 'pg_ts_config_map[]';
        case 10068: return 'pg_ts_dict';	case 10067: return 'pg_ts_dict[]';
        case 10070: return 'pg_ts_parser';	case 10069: return 'pg_ts_parser[]';
        case 10072: return 'pg_ts_template';	case 10071: return 'pg_ts_template[]';
        case 71: return 'pg_type';	case 210: return 'pg_type[]';
        case 12016: return 'pg_user';	case 12015: return 'pg_user[]';
        case 10080: return 'pg_user_mapping';	case 10079: return 'pg_user_mapping[]';
        case 12329: return 'pg_user_mappings';	case 12328: return 'pg_user_mappings[]';
        case 12030: return 'pg_views';	case 12029: return 'pg_views[]';
        case 779569: return 'pgogen';	case 779568: return 'pgogen[]';
        case 600: return 'point';	case 1017: return 'point[]';
        case 604: return 'polygon';	case 1027: return 'polygon[]';
        case 2249: return 'record';	case 2287: return 'record[]';
        case 1790: return 'refcursor';	case 2201: return 'refcursor[]';
        case 12539: return 'referential_constraints';	case 12538: return 'referential_constraints[]';
        case 2205: return 'regclass';	case 2210: return 'regclass[]';
        case 4191: return 'regcollation';	case 4192: return 'regcollation[]';
        case 3734: return 'regconfig';	case 3735: return 'regconfig[]';
        case 3769: return 'regdictionary';	case 3770: return 'regdictionary[]';
        case 4089: return 'regnamespace';	case 4090: return 'regnamespace[]';
        case 2203: return 'regoper';	case 2208: return 'regoper[]';
        case 2204: return 'regoperator';	case 2209: return 'regoperator[]';
        case 24: return 'regproc';	case 1008: return 'regproc[]';
        case 2202: return 'regprocedure';	case 2207: return 'regprocedure[]';
        case 4096: return 'regrole';	case 4097: return 'regrole[]';
        case 2206: return 'regtype';	case 2211: return 'regtype[]';
        case 12544: return 'role_column_grants';	case 12543: return 'role_column_grants[]';
        case 12558: return 'role_routine_grants';	case 12557: return 'role_routine_grants[]';
        case 12621: return 'role_table_grants';	case 12620: return 'role_table_grants[]';
        case 12650: return 'role_udt_grants';	case 12649: return 'role_udt_grants[]';
        case 12659: return 'role_usage_grants';	case 12658: return 'role_usage_grants[]';
        case 12548: return 'routine_column_usage';	case 12547: return 'routine_column_usage[]';
        case 12553: return 'routine_privileges';	case 12552: return 'routine_privileges[]';
        case 12562: return 'routine_routine_usage';	case 12561: return 'routine_routine_usage[]';
        case 12567: return 'routine_sequence_usage';	case 12566: return 'routine_sequence_usage[]';
        case 12572: return 'routine_table_usage';	case 12571: return 'routine_table_usage[]';
        case 12577: return 'routines';	case 12576: return 'routines[]';
        case 12582: return 'schemata';	case 12581: return 'schemata[]';
        case 12586: return 'sequences';	case 12585: return 'sequences[]';
        case 16699: return 'spatial_ref_sys';	case 16698: return 'spatial_ref_sys[]';
        case 16386: return 'spheroid';	case 16389: return 'spheroid[]';
        case 12591: return 'sql_features';	case 12590: return 'sql_features[]';
        case 12424: return 'sql_identifier';	case 12423: return 'sql_identifier[]';
        case 12596: return 'sql_implementation_info';	case 12595: return 'sql_implementation_info[]';
        case 12601: return 'sql_parts';	case 12600: return 'sql_parts[]';
        case 12606: return 'sql_sizing';	case 12605: return 'sql_sizing[]';
        case 269: return 'table_am_handler';	case 0: return 'table_am_handler[]';
        case 12611: return 'table_constraints';	case 12610: return 'table_constraints[]';
        case 12616: return 'table_privileges';	case 12615: return 'table_privileges[]';
        case 12625: return 'tables';	case 12624: return 'tables[]';
        case 25: return 'text';	case 1009: return 'text[]';
        case 27: return 'tid';	case 1010: return 'tid[]';
        case 1083: return 'time';	case 1183: return 'time[]';
        case 12430: return 'time_stamp';	case 12429: return 'time_stamp[]';
        case 1114: return 'timestamp';	case 1115: return 'timestamp[]';
        case 1184: return 'timestamptz';	case 1185: return 'timestamptz[]';
        case 1266: return 'timetz';	case 1270: return 'timetz[]';
        case 12630: return 'transforms';	case 12629: return 'transforms[]';
        case 2279: return 'trigger';	case 0: return 'trigger[]';
        case 12635: return 'triggered_update_columns';	case 12634: return 'triggered_update_columns[]';
        case 12640: return 'triggers';	case 12639: return 'triggers[]';
        case 3310: return 'tsm_handler';	case 0: return 'tsm_handler[]';
        case 4533: return 'tsmultirange';	case 6152: return 'tsmultirange[]';
        case 3615: return 'tsquery';	case 3645: return 'tsquery[]';
        case 3908: return 'tsrange';	case 3909: return 'tsrange[]';
        case 4534: return 'tstzmultirange';	case 6153: return 'tstzmultirange[]';
        case 3910: return 'tstzrange';	case 3911: return 'tstzrange[]';
        case 3614: return 'tsvector';	case 3643: return 'tsvector[]';
        case 2970: return 'txid_snapshot';	case 2949: return 'txid_snapshot[]';
        case 12645: return 'udt_privileges';	case 12644: return 'udt_privileges[]';
        case 705: return 'unknown';	case 0: return 'unknown[]';
        case 12654: return 'usage_privileges';	case 12653: return 'usage_privileges[]';
        case 12663: return 'user_defined_types';	case 12662: return 'user_defined_types[]';
        case 12750: return 'user_mapping_options';	case 12749: return 'user_mapping_options[]';
        case 12755: return 'user_mappings';	case 12754: return 'user_mappings[]';
        case 2950: return 'uuid';	case 2951: return 'uuid[]';
        case 16808: return 'valid_detail';	case 16807: return 'valid_detail[]';
        case 1562: return 'varbit';	case 1563: return 'varbit[]';
        case 1043: return 'varchar';	case 1015: return 'varchar[]';
        case 12668: return 'view_column_usage';	case 12667: return 'view_column_usage[]';
        case 12673: return 'view_routine_usage';	case 12672: return 'view_routine_usage[]';
        case 12678: return 'view_table_usage';	case 12677: return 'view_table_usage[]';
        case 12683: return 'views';	case 12682: return 'views[]';
        case 2278: return 'void';	case 0: return 'void[]';
        case 28: return 'xid';	case 1011: return 'xid[]';
        case 5069: return 'xid8';	case 271: return 'xid8[]';
        case 142: return 'xml';	case 143: return 'xml[]';
        case 12432: return 'yes_or_no';	case 12431: return 'yes_or_no[]';
      }
    },
    // click_row(out_idx, row_idx) {
    //   if (this.is_row_selected(out_idx, row_idx)) return;
    //   this.$store.select_row(out_idx, row_idx);
    //   this.$root.$el.dispatchEvent(new CustomEvent('req_map_navigate', { detail: { out_idx, row_idx, origin: 'sheet' } }));
    // },
    on_cell_click(out_idx, /** @type {HTMLElement} */ target) {
      const row_idx = Number(target.closest('[data-row_idx]').dataset.row_idx);
      // TODO nullsafe
      const col_idx = Number(target.closest('[data-col_idx]').dataset.col_idx);
      // this.$store.select_row(out_idx, row_idx);
      this.$store.select_rowcol(out_idx, row_idx, col_idx);
      this.$root.$el.dispatchEvent(new CustomEvent('req_map_navigate', { detail: { out_idx, row_idx, origin: 'sheet' } }));
    },
    on_row_navigate({ detail: { out_idx, row_idx } }) {
      const tr = this.$el.querySelector(`[data-out_idx="${out_idx}"] [data-row_idx="${row_idx}"]`);
      tr.scrollIntoView({ block: 'center' });
    },
  },
};
