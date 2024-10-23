use cosmwasm_std::{
    entry_point, to_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult, Uint128,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct InstantiateMsg {
    pub count: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct CountResponse {
    pub count: Uint128,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct State {
    pub count: Uint128,
    pub owner: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum ExecuteMsg {
    Increment { amount: Uint128 },
    Decrement { amount: Uint128 },
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    GetCount {},
}

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> StdResult<Response> {
    let state = State {
        count: msg.count,
        owner: info.sender.to_string(),
    };
    deps.storage.set(b"state", &to_binary(&state)?);
    Ok(Response::new().add_attribute("method", "instantiate"))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> StdResult<Response> {
    match msg {
        ExecuteMsg::Increment { amount } => try_increment(deps, info, amount),
        ExecuteMsg::Decrement { amount } => try_decrement(deps, info, amount),
    }
}

pub fn try_increment(deps: DepsMut, _info: MessageInfo, amount: Uint128) -> StdResult<Response> {
    let mut state: State = deps.storage.get(b"state").unwrap().unwrap();
    state.count += amount;
    deps.storage.set(b"state", &to_binary(&state)?);
    Ok(Response::new().add_attribute("method", "try_increment"))
}

pub fn try_decrement(deps: DepsMut, _info: MessageInfo, amount: Uint128) -> StdResult<Response> {
    let mut state: State = deps.storage.get(b"state").unwrap().unwrap();
    state.count = state.count.checked_sub(amount).unwrap();
    deps.storage.set(b"state", &to_binary(&state)?);
    Ok(Response::new().add_attribute("method", "try_decrement"))
}

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCount {} => to_binary(&query_count(deps)?),
    }
}

fn query_count(deps: Deps) -> StdResult<CountResponse> {
    let state: State = deps.storage.get(b"state").unwrap().unwrap();
    Ok(CountResponse { count: state.count })
}
