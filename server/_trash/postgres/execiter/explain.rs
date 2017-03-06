use dbms::QueryPlanNode;
use rustc_serialize::json;

pub fn queryplan_from_jsonstr(jsonstr: &str) -> Option<QueryPlanNode> {
    json::Json::from_str(jsonstr)
        .ok()
        .and_then(queryplan_from_json)
}

fn queryplan_from_json(inp: json::Json) -> Option<QueryPlanNode> {

    let inp = inp.as_array()
                .and_then(|it| it.first())
                .and_then(|it| it.find("Plan"))
                .and_then(|it| it.as_object());

    let inp = match inp {
        Some(x) => x,
        None => return None
    };

    struct AbsCostQueryPlan {
        self_cost: Option<f64>,
        total_cost: Option<f64>,
        typ: String,
        children: Vec<AbsCostQueryPlan>,
        properties: json::Object
    }



    // let mut stack = vec![inp];
    // while let Some(node) = stack.pop() {
    //     if let Some(children) = node.get("Plans").and_then(|it| it.as_array()) {
    //         for child in children.iter().filter_map(|it| it.as_object()) {
    //             stack.push(child);
    //         }
    //     }
    //     println!("{:?}", node.get("Node Type"));
    // }


    let cost_prop = ["Actual Total Time", "Total Cost"]
                    .iter()
                    .map(|&it| it)
                    .filter(|&it| inp.contains_key(it))
                    .next();



    fn make_node(obj: &json::Object, cost_prop: Option<&str>) -> AbsCostQueryPlan {
        let children = obj.get("Plans")
                        .and_then(|it| it.as_array())
                        .unwrap_or(&Vec::new())
                        .iter()
                        .filter_map(|it| it.as_object())
                        .map(|it| make_node(it, cost_prop))
                        .collect::<Vec<_>>();


        let total_cost = cost_prop.and_then(|it| obj.get(it))
                                  .and_then(|it| it.as_f64());

        let children_cost = children.iter()
                                .filter_map(|child| child.total_cost)
                                .fold(0f64, |acc, x| acc + x);

        let self_cost = total_cost.map(|it| it - children_cost);

        AbsCostQueryPlan {
            self_cost: self_cost,
            total_cost: total_cost,
            children: children,

            typ: obj.get("Node Type")
                    .and_then(|it| it.as_string())
                    .unwrap_or("Unknown")
                    .to_string(),

            properties: {
                let mut props = obj.clone();
                props.remove("Plans");
                props
            }
        }
    }

    let abs_cost_query_plan = make_node(&inp, cost_prop);

    let min_cost_and_factor = {
        let mut min_cost = ::std::f64::INFINITY;
        let mut max_cost = ::std::f64::NEG_INFINITY;
        let mut stack = vec![&abs_cost_query_plan];
        while let Some(node) = stack.pop() {
            stack.extend(&node.children);
            if let Some(it) = node.self_cost {
                min_cost = min_cost.min(it);
                max_cost = max_cost.max(it);
            }
        }

        if min_cost.is_finite() &&
            max_cost.is_finite() &&
            max_cost - min_cost > ::std::f64::EPSILON
        {
            Some((min_cost, (max_cost - min_cost).recip()))
        } else {
            None
        }
    };



    fn make_node1(node: AbsCostQueryPlan,
                  min_cost: Option<f64>,
                  cost_factor: Option<f64>)
                  -> QueryPlanNode
    {
        QueryPlanNode {
            typ: node.typ,
            children: node.children.into_iter().map(|child| make_node1(child, min_cost, cost_factor)).collect(),
            properties: node.properties,
            heat: match (node.self_cost, min_cost, cost_factor) {
                (Some(self_cost), Some(min_cost), Some(cost_factor)) => {
                    Some((self_cost - min_cost) * cost_factor)
                }
                _ => None
            }
        }
    }

    Some(make_node1(abs_cost_query_plan,
                    min_cost_and_factor.map(|(min, _)| min),
                    min_cost_and_factor.map(|(_, factor)| factor)))
}
