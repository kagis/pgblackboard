for x in sqlsplit(r"""
    select 1 as "asd;";
    select $a$ $str;; $a$;
    select $$ollo$$;
    select /* comment; */;
    -- ololo;
    -- lalla;
    select 'str;';
    select e'asd\';';


    \connect geoportalkz

set search_path = alphamap, adm, demo, public;
/*
alter table class add feattable text;
alter table class add featidcol text;
alter table class add feattitleexpr_ru text;

update class
set feattable = classname;

alter table class alter column feattable set not null;
*/


drop function passport_json(text, int, text);
CREATE OR REPLACE FUNCTION passport_json(layername text, featureid integer, scopename text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    result json;
begin
    execute (
        with queried_props as (
            select prop.*
            from prop join backref on backref.refclassname = prop.classname
            where backref.classname = 'politicalunit'
              and backref.propname = passport_json.layername
              and prop.scopename is not distinct from passport_json.scopename
              and prop.datatype != 'reference'
        ),

        prop_expr_cte as (
            select coalesce(caption_ru, caption_kk, caption_en) as caption
                ,propname
                ,case when ismultilingual
                    then format('coalesce(%1$s__ru, %1$s__kk, %1$s__en) as %1$s', propname)
                    else quote_ident(propname)
                    end as expr
            from queried_props
        )/*,

        sat_tables_cte as (
            select distinct srctable
            from queried_props
            where srctable is not null
        )
        */
        select format($dynsql$
            with feature as (
                select %2$I as "id"
                    ,(select p from (select %3$s) as p) as "properties"
                from %1$I
                where %2$I = $1
            ),

            feature_collection as (
                select 'FeatureCollection' as "type"
                    ,%4$L::json            as "properties"
                    ,array_agg(feature)    as "features"
                from feature
            )

            select row_to_json(feature_collection)
            from feature_collection
        $dynsql$
            ,backref.refclassname
            ,backref.refclassname || '__id'
            ,(select string_agg(expr, ',') from prop_expr_cte)
            ,(select json_object_agg(propname, caption) from prop_expr_cte)
        )
        from backref
        where backref.classname = 'politicalunit'
          and backref.propname = passport_json.layername
    ) into result using passport_json.featureid;

    return result;
end
$function$;

select passport_json('eduinsts', 1, null)
"""):
    print(x)
    print('----------------------------------')
