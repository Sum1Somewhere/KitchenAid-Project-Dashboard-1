import React, { useState, useEffect, useCallback } from "react";

const T = {
  bg:"#F5F7FA",card:"#FFFFFF",border:"#E5E7EB",divider:"#D1D5DB",
  text:"#111827",sub:"#6B7280",muted:"#9CA3AF",
  risk:"#EF4444",warning:"#F59E0B",active:"#3B82F6",healthy:"#22C55E",paused:"#9CA3AF",
};
const STAGE_COLORS = {
  Kickoff:"#94A3B8","North Star":"#8B5CF6",Concept:"#6366F1",Design:"#06B6D4",
  Tooling:"#F59E0B","KA Review":"#3B82F6","Pkg Approval":"#F97316",
  Production:"#22C55E",Launch:"#16A34A",Paused:"#9CA3AF",Killed:"#6B7280",
};
const FILTER_STYLES = {
  launchRisk:{bg:"#FEE2E2",text:"#991B1B",label:"Launch At Risk"},
  stuck:{bg:"#FEF3C7",text:"#92400E",label:"Stuck In Stage"},
  awaiting:{bg:"#FFEDD5",text:"#9A3412",label:"Awaiting Decision"},
  noUpdate:{bg:"#E5E7EB",text:"#374151",label:"No Update"},
  nearLaunch:{bg:"#DCFCE7",text:"#166534",label:"Near Launch"},
};
const UPDATE_ACTIONS = {
  Stage:[
    {id:"move_forward",label:"▶  Move to next stage",apply:(p)=>applyStageChange(p,nextStage(p),`Advanced to ${nextStage(p)}.`)},
    {id:"move_back",label:"◀  Move back one stage",apply:(p)=>applyStageChange(p,prevStage(p),`Moved back to ${prevStage(p)}.`)},
    {id:"pause",label:"⏸  Pause project",apply:(p)=>applyStageChange(p,"Paused","Project paused.")},
    {id:"kill",label:"✕  Kill project",apply:(p)=>applyStageChange(p,"Killed","Project killed.")},
  ],
  Progress:[
    {id:"ka_responded",label:"KA feedback received",apply:(p)=>applyFields(p,{awaitingKA:false},"KA feedback received.")},
    {id:"north_star",label:"North Star received",apply:(p)=>applyFields(p,{northStar:true},"North Star received from KA.")},
    {id:"retailer_commit",label:"Retailer committed",apply:(p)=>applyFields(p,{retailerCommit:true},"Retailer commitment confirmed.")},
    {id:"pkg_approved",label:"Packaging approved",apply:(p)=>applyFields(p,{pkgApproved:true},"Packaging approved by KA.")},
    {id:"cost_approved",label:"Cost / margin approved",apply:(p)=>applyFields(p,{},"Cost and margin approved.")},
    {id:"po_issued",label:"Production PO issued",apply:(p)=>applyFields(p,{},"Production PO issued.")},
    {id:"photo_complete",label:"Photoshoot complete",apply:(p)=>applyFields(p,{},"Photoshoot complete.")},
  ],
  Blocker:[
    {id:"await_ka",label:"Waiting on KA",apply:(p)=>applyFields(p,{awaitingKA:true},"Waiting on KA response."),delay:"KA review delay"},
    {id:"await_factory",label:"Waiting on factory",apply:(p)=>applyFields(p,{},"Waiting on factory."),delay:"Factory delay"},
    {id:"await_retailer",label:"Waiting on retailer",apply:(p)=>applyFields(p,{},"Waiting on retailer decision."),delay:"Retailer decision delay"},
    {id:"await_internal",label:"Waiting on internal decision",apply:(p)=>applyFields(p,{},"Waiting on internal decision."),delay:"Awaiting resources"},
    {id:"design_revision",label:"Design revision required",apply:(p)=>applyFields(p,{revisions:(p.revisions||0)+1},"Design revision required."),delay:"Design revision"},
    {id:"pkg_change",label:"Packaging change",apply:(p)=>applyFields(p,{},"Packaging change required."),delay:"Packaging change"},
  ],
  Tooling:[
    {id:"t1_sent",label:"T1 samples sent",apply:(p)=>applyFields(p,{tSample:1},"T1 samples sent to KA.")},
    {id:"t2_sent",label:"T2 samples sent",apply:(p)=>applyFields(p,{tSample:2},"T2 samples sent to KA.")},
    {id:"t3_sent",label:"T3 samples sent",apply:(p)=>applyFields(p,{tSample:3},"T3 samples sent to KA.")},
    {id:"t4_sent",label:"T4 samples sent ⚠",apply:(p)=>applyFields(p,{tSample:4},"T4 samples sent — quality flag.")},
    {id:"t_approved",label:"T samples approved",apply:(p)=>applyFields(p,{},"T samples approved by KA.")},
    {id:"t_rejected",label:"T samples rejected",apply:(p)=>applyFields(p,{},"T samples rejected — rework required."),delay:"Tooling delay"},
  ],
  Escalation:[
    {id:"needs_decision",label:"Needs decision — escalating",apply:(p)=>applyFields(p,{},"Escalated — decision required.")},
    {id:"timeline_risk",label:"Timeline at risk",apply:(p)=>applyFields(p,{},"Timeline at risk flagged.")},
    {id:"rec_pause",label:"Recommend pause",apply:(p)=>applyFields(p,{},"Recommend pausing this project.")},
    {id:"rec_kill",label:"Recommend kill",apply:(p)=>applyFields(p,{},"Recommend killing this project.")},
  ],
};
const STAGES = ["Kickoff","North Star","Concept","Design","Tooling","KA Review","Pkg Approval","Production","Launch","Paused","Killed"];
const STAGE_META = {
  "Kickoff":{color:STAGE_COLORS.Kickoff,days:7},
  "North Star":{color:STAGE_COLORS["North Star"],days:14},
  "Concept":{color:STAGE_COLORS.Concept,days:60},
  "Design":{color:STAGE_COLORS.Design,days:60},
  "Tooling":{color:STAGE_COLORS.Tooling,days:90},
  "KA Review":{color:STAGE_COLORS["KA Review"],days:14},
  "Pkg Approval":{color:STAGE_COLORS["Pkg Approval"],days:14},
  "Production":{color:STAGE_COLORS.Production,days:120},
  "Launch":{color:STAGE_COLORS.Launch,days:0},
  "Paused":{color:STAGE_COLORS.Paused,days:999},
  "Killed":{color:STAGE_COLORS.Killed,days:999},
};
const OWNERS = ["Bryan Gardner","Jamie Pitelli","Bobby Abraham"];
const KA_CONTACTS = ["Tandy U.","Amy S."];
const REGIONS = ["US","Canada","Mexico","UK","Europe","Australia","Asia","Global"];
const VOLUME_RANGES = ["Under $250K","$250K–$500K","$500K–$1M","$1M–$2.5M","$2.5M–$5M","$5M+"];
const VOL_MAP = {"Under $250K":125000,"$250K–$500K":375000,"$500K–$1M":750000,"$1M–$2.5M":1750000,"$2.5M–$5M":3750000,"$5M+":6000000};
const INACTIVITY_DAYS = 14;

const nowTs = () => new Date().toISOString();
const tod = () => new Date();
const daysAgo = d => Math.max(0,Math.floor((tod()-new Date(d))/86400000));
const daysUntil = d => Math.floor((new Date(d)-tod())/86400000);
const fmtDate = d => d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"2-digit"}):"—";
const fmtTs = d => d?new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const uid = () => Math.random().toString(36).slice(2,9);
const OFF = (n=0) => new Date(Date.now()-n*86400000).toISOString();
const fmtVal = v => v>=1000000?`$${(v/1000000).toFixed(1)}M`:v>=1000?`$${Math.round(v/1000)}K`:`$${v}`;
const volOf = p => VOL_MAP[p.annualVolume]||0;
const nextStage = p => { const i=STAGES.indexOf(p.stage); return STAGES[i+1]&&!["Killed"].includes(STAGES[i+1])?STAGES[i+1]:p.stage; };
const prevStage = p => { const i=STAGES.indexOf(p.stage); return i>0&&!["Killed"].includes(STAGES[i-1])?STAGES[i-1]:p.stage; };

function calcGateDates(ld) {
  if(!ld) return {};
  const L=new Date(ld),sub=(d,n)=>new Date(d.getTime()-n*86400000);
  const P=sub(L,120),KA=sub(P,14),To=sub(KA,90),De=sub(To,60),Co=sub(De,60),NS=sub(Co,14),Ki=sub(NS,7);
  return {Launch:L,Production:P,"KA Review":KA,"Pkg Approval":KA,Tooling:To,Design:De,Concept:Co,"North Star":NS,Kickoff:Ki};
}
function calcProjectedDates(p) {
  const order=["Kickoff","North Star","Concept","Design","Tooling","KA Review","Pkg Approval","Production","Launch"];
  const ci=order.indexOf(p.stage);
  if(ci<0||!p.launchDate) return {slipDays:0,projectedLaunch:null,projected:{},baseline:calcGateDates(p.launchDate)};
  const baseline=calcGateDates(p.launchDate),projected={};
  let cursor=new Date(p.stageEnteredAt);
  for(let i=ci;i<order.length;i++){
    const s=order[i];projected[s]={start:new Date(cursor)};
    cursor=new Date(cursor.getTime()+(STAGE_META[s]?.days||0)*86400000);
    projected[s].end=new Date(cursor);
  }
  const projLaunch=projected["Launch"]?.start||null;
  const slip=projLaunch?Math.max(0,Math.floor((projLaunch-new Date(p.launchDate))/86400000)):0;
  return {slipDays:slip,projectedLaunch:projLaunch,projected,baseline};
}
function computeFlags(p) {
  const risk=[],biz=[];
  const dis=daysAgo(p.stageEnteredAt),max=STAGE_META[p.stage]?.days||30;
  if(!p.owner) risk.push("No owner");
  if(!p.launchDate) risk.push("No launch date");
  if(dis>max&&!["Paused","Killed","Launch"].includes(p.stage)) risk.push("Stuck in stage");
  if(!p.northStar&&["Concept","Design","Tooling"].includes(p.stage)) risk.push("North Star missing");
  if((p.tSample||0)>=4) risk.push("T4+ samples");
  if(p.awaitingKA) risk.push("Awaiting KA");
  if(p.stage==="Production"&&!p.pkgApproved) risk.push("Pkg not approved");
  if(daysAgo(p.lastUpdated)>INACTIVITY_DAYS&&!["Paused","Killed","Launch"].includes(p.stage)) risk.push("No recent activity");
  if(p.launchDate){
    const gd=calcGateDates(p.launchDate)[p.stage];
    if(gd&&new Date(gd)<tod()&&!["Paused","Killed","Launch"].includes(p.stage)) risk.push("Gate deadline passed");
    const dtl=daysUntil(p.launchDate);
    if(dtl>=0&&dtl<=45&&!["Paused","Killed","Launch"].includes(p.stage)) risk.push("Near launch");
  }
  if(!p.retailerCommit&&["Tooling","KA Review","Production"].includes(p.stage)) biz.push("Retail not committed");
  return {risk,biz};
}
function launchRisk(p) {
  if(!p.launchDate||["Killed","Paused","Launch"].includes(p.stage)) return null;
  const order=Object.keys(STAGE_META);
  const remaining=order.slice(order.indexOf(p.stage)+1).filter(s=>calcGateDates(p.launchDate)[s]);
  const totalLeft=remaining.reduce((a,s)=>a+(STAGE_META[s]?.days||0),0);
  const dtl=daysUntil(p.launchDate);
  return dtl<totalLeft?{at:true,shortfall:totalLeft-dtl}:{at:false};
}
function getStatusColor(p,flags,risk) {
  if(["Paused","Killed"].includes(p.stage)) return T.paused;
  if(risk?.at||flags.risk.includes("Stuck in stage")||(p.tSample||0)>=4) return T.risk;
  if(p.awaitingKA||flags.risk.includes("No recent activity")||flags.risk.includes("Gate deadline passed")) return T.warning;
  if(flags.risk.length===0&&flags.biz.length===0) return T.healthy;
  return T.active;
}
function priorityScore(p,flags,risk) {
  let s=0;
  if(risk?.at) s+=1000;
  if(flags.risk.includes("Stuck in stage")) s+=500;
  if(flags.risk.includes("Near launch")) s+=300;
  if(p.awaitingKA) s+=200;
  if(flags.risk.includes("No recent activity")) s+=100;
  if(p.launchDate) s+=Math.max(0,90-daysUntil(p.launchDate));
  s+=daysAgo(p.stageEnteredAt);
  return s;
}
function applyStageChange(project,newStage,text) {
  if(!newStage||newStage===project.stage) return project;
  const ts=nowTs(),prev=project.stage;
  return {...project,stage:newStage,stageEnteredAt:ts,lastUpdated:ts,latestUpdate:text,
    stageHistory:[...(project.stageHistory||[]).map(sh=>sh.stage===prev&&!sh.exited?{...sh,exited:ts,duration:daysAgo(sh.entered)}:sh),{stage:newStage,entered:ts,exited:null,duration:null}],
    history:[...(project.history||[]),{id:uid(),ts,type:"stage",text,stage:newStage,flags:[],delayReasons:[],stageChanged:{from:prev,to:newStage}}]};
}
function applyFields(project,fields,text,delayReason) {
  const ts=nowTs();
  return {...project,...fields,lastUpdated:ts,latestUpdate:text,
    history:[...(project.history||[]),{id:uid(),ts,type:"update",text,stage:project.stage,flags:[],delayReasons:delayReason?[delayReason]:[]}]};
}
function buildHistory(entries){return entries.map(e=>({id:uid(),...e}));}

const SEED=[
  {id:"p1",name:"Soft Tools Line",type:"multi-sku",skuCount:15,stage:"Design",owner:"Bryan Gardner",launchDate:"2026-10-01",stageEnteredAt:OFF(65),createdAt:OFF(200),lastUpdated:OFF(5),northStar:true,tSample:0,awaitingKA:false,retailerCommit:false,pkgApproved:false,revenueScore:8,revisions:3,kaContact:"Tandy U.",region:"US",annualVolume:"$1M–$2.5M",
    history:buildHistory([{ts:OFF(200),type:"created",text:"Project created.",stage:"Kickoff",flags:[],delayReasons:[]},{ts:OFF(5),type:"update",text:"Production revs submitted. Steve signed off.",stage:"Design",flags:[],delayReasons:["Design revision"]}]),
    stageHistory:[{stage:"Kickoff",entered:OFF(200),exited:OFF(185),duration:15},{stage:"North Star",entered:OFF(185),exited:OFF(150),duration:35},{stage:"Concept",entered:OFF(150),exited:OFF(90),duration:60},{stage:"Design",entered:OFF(90),exited:null,duration:null}]},
  {id:"p2",name:"Soft Gadgets",type:"multi-sku",skuCount:9,stage:"Tooling",owner:"Jamie Pitelli",launchDate:"2026-07-15",stageEnteredAt:OFF(38),createdAt:OFF(280),lastUpdated:OFF(2),northStar:true,tSample:2,awaitingKA:true,retailerCommit:false,pkgApproved:false,revenueScore:7,revisions:2,kaContact:"Tandy U.",region:"US",annualVolume:"$500K–$1M",
    history:buildHistory([{ts:OFF(280),type:"created",text:"Project created.",stage:"Kickoff",flags:[],delayReasons:[]},{ts:OFF(2),type:"update",text:"T2 samples sent to KA. Awaiting feedback.",stage:"Tooling",flags:[],delayReasons:["KA review delay"]}]),
    stageHistory:[{stage:"Kickoff",entered:OFF(280),exited:OFF(240),duration:40},{stage:"Concept",entered:OFF(240),exited:OFF(140),duration:100},{stage:"Design",entered:OFF(140),exited:OFF(38),duration:102},{stage:"Tooling",entered:OFF(38),exited:null,duration:null}]},
  {id:"p3",name:"Trigger Ice Cream Scoop",type:"single",skuCount:1,stage:"Tooling",owner:"Bobby Abraham",launchDate:"2026-06-15",stageEnteredAt:OFF(20),createdAt:OFF(210),lastUpdated:OFF(16),northStar:true,tSample:4,awaitingKA:true,retailerCommit:false,pkgApproved:false,revenueScore:6,revisions:3,kaContact:"Amy S.",region:"US",annualVolume:"$250K–$500K",
    history:buildHistory([{ts:OFF(210),type:"created",text:"Project created.",stage:"Kickoff",flags:[],delayReasons:[]},{ts:OFF(16),type:"update",text:"T4 issue — Leon discussing with factory.",stage:"Tooling",flags:[],delayReasons:["Tooling delay"]}]),
    stageHistory:[{stage:"Kickoff",entered:OFF(210),exited:OFF(190),duration:20},{stage:"Concept",entered:OFF(190),exited:OFF(100),duration:90},{stage:"Design",entered:OFF(100),exited:OFF(20),duration:80},{stage:"Tooling",entered:OFF(20),exited:null,duration:null}]},
  {id:"p4",name:"Rotary Grater",type:"single",skuCount:1,stage:"Pkg Approval",owner:"Jamie Pitelli",launchDate:"2026-05-01",stageEnteredAt:OFF(9),createdAt:OFF(300),lastUpdated:OFF(3),northStar:true,tSample:2,awaitingKA:true,retailerCommit:true,pkgApproved:false,revenueScore:8,revisions:0,kaContact:"Tandy U.",region:"US",annualVolume:"$500K–$1M",
    history:buildHistory([{ts:OFF(300),type:"created",text:"Project created.",stage:"Kickoff",flags:[],delayReasons:[]},{ts:OFF(3),type:"update",text:"Packaging dieline submitted to KA.",stage:"Pkg Approval",flags:[],delayReasons:["KA review delay"]}]),
    stageHistory:[{stage:"Design",entered:OFF(250),exited:OFF(180),duration:70},{stage:"Tooling",entered:OFF(180),exited:OFF(9),duration:171},{stage:"Pkg Approval",entered:OFF(9),exited:null,duration:null}]},
  {id:"p5",name:"Walmart Annual Event",type:"single",skuCount:1,stage:"KA Review",owner:"Bryan Gardner",launchDate:"2026-05-15",stageEnteredAt:OFF(8),createdAt:OFF(160),lastUpdated:OFF(1),northStar:true,tSample:2,awaitingKA:false,retailerCommit:true,pkgApproved:true,revenueScore:9,revisions:0,kaContact:"Amy S.",region:"US",annualVolume:"$2.5M–$5M",
    history:buildHistory([{ts:OFF(160),type:"created",text:"Project created.",stage:"Kickoff",flags:[],delayReasons:[]},{ts:OFF(1),type:"update",text:"Box mock on Tuesday for front facing review.",stage:"KA Review",flags:[],delayReasons:[]}]),
    stageHistory:[{stage:"Design",entered:OFF(130),exited:OFF(60),duration:70},{stage:"Tooling",entered:OFF(60),exited:OFF(8),duration:52},{stage:"KA Review",entered:OFF(8),exited:null,duration:null}]},
  {id:"p6",name:"Garlic Press",type:"single",skuCount:1,stage:"North Star",owner:"Bobby Abraham",launchDate:"2026-12-01",stageEnteredAt:OFF(4),createdAt:OFF(18),lastUpdated:OFF(4),northStar:false,tSample:0,awaitingKA:true,retailerCommit:false,pkgApproved:false,revenueScore:6,revisions:0,kaContact:"Tandy U.",region:"US",annualVolume:"$250K–$500K",
    history:buildHistory([{ts:OFF(18),type:"created",text:"Project created.",stage:"Kickoff",flags:[],delayReasons:[]},{ts:OFF(4),type:"update",text:"North Star requested from KA. Waiting on Tandy.",stage:"North Star",flags:[],delayReasons:["KA review delay"]}]),
    stageHistory:[{stage:"Kickoff",entered:OFF(18),exited:OFF(4),duration:14},{stage:"North Star",entered:OFF(4),exited:null,duration:null}]},
];

const STORAGE_KEY="ka_tracker_v5";
async function saveProjects(p){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(p));}catch(e){}}
async function loadPersistedProjects(){try{const r=localStorage.getItem(STORAGE_KEY);if(r)return JSON.parse(r);}catch(e){}return null;}

function Modal({children,onClose,wide}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:"20px",overflowY:"auto"}} onClick={onClose}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"10px",padding:"24px",maxWidth:wide?"760px":"580px",width:"100%",marginTop:"20px",boxShadow:"0 4px 24px rgba(0,0,0,0.10)"}} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function UpdatePanel({project,onUpdate}){
  const [open,setOpen]=useState(false);
  const [tab,setTab]=useState("Stage");
  const tabs=Object.keys(UPDATE_ACTIONS);
  const PANEL_HEIGHT=220;
  const handleAction=(action)=>{
    const updated=action.apply(project);
    if(updated&&updated!==project){
      if(action.delay&&updated.history){const last=updated.history[updated.history.length-1];if(last)last.delayReasons=[action.delay];}
      onUpdate(updated);
    }
    setOpen(false);
  };
  if(!open) return(
    <button onClick={e=>{e.stopPropagation();setOpen(true);}} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:"6px",padding:"4px 12px",cursor:"pointer",fontSize:"12px",color:T.sub,fontFamily:"inherit",fontWeight:500}}>+ Update</button>
  );
  return(
    <div style={{border:`1px solid ${T.border}`,borderRadius:"8px",overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",background:"#F9FAFB",borderBottom:`1px solid ${T.border}`}}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:tab===t?"white":"transparent",color:tab===t?T.text:T.muted,border:"none",borderRight:`1px solid ${T.border}`,padding:"8px 0",cursor:"pointer",fontSize:"12px",fontWeight:tab===t?700:400,fontFamily:"inherit",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {t}
          </button>
        ))}
        <button onClick={()=>setOpen(false)} style={{background:"transparent",border:"none",color:T.muted,padding:"8px 10px",cursor:"pointer",fontSize:"14px",lineHeight:1,flexShrink:0}}>×</button>
      </div>
      <div style={{height:`${PANEL_HEIGHT}px`,overflowY:"auto",background:T.card}}>
        {UPDATE_ACTIONS[tab].map((action,i)=>{
          const isDisabled=(action.id==="move_forward"&&nextStage(project)===project.stage)||(action.id==="move_back"&&prevStage(project)===project.stage);
          return(
            <button key={i} onClick={()=>!isDisabled&&handleAction(action)}
              style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${T.border}`,padding:"10px 14px",cursor:isDisabled?"default":"pointer",fontSize:"13px",color:isDisabled?T.muted:T.text,fontFamily:"inherit",textAlign:"left",display:"block",opacity:isDisabled?0.4:1}}
              onMouseEnter={e=>{if(!isDisabled)e.currentTarget.style.background="#F9FAFB";}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HistoryPanel({history}){
  const [open,setOpen]=useState(false);
  const sorted=[...(history||[])].sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  const typeColor={stage:T.active,update:T.sub,created:T.healthy,meeting:"#8B5CF6"};
  return(
    <div>
      <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"none",color:T.muted,fontSize:"11px",cursor:"pointer",fontFamily:"inherit",padding:"3px 0",display:"flex",alignItems:"center",gap:"4px"}}>
        <span style={{fontSize:"9px"}}>{open?"▾":"▸"}</span>{sorted.length} event{sorted.length!==1?"s":""}
      </button>
      {open&&(
        <div style={{marginTop:"6px",borderLeft:`2px solid ${T.border}`,paddingLeft:"12px",display:"flex",flexDirection:"column",gap:"8px",maxHeight:"200px",overflowY:"auto"}}>
          {sorted.map(h=>(
            <div key={h.id}>
              <div style={{display:"flex",gap:"6px",alignItems:"center",marginBottom:"2px",flexWrap:"wrap"}}>
                <span style={{fontSize:"10px",color:T.muted,fontFamily:"monospace"}}>{fmtTs(h.ts)}</span>
                <span style={{background:`${typeColor[h.type]||T.muted}18`,color:typeColor[h.type]||T.muted,borderRadius:"3px",padding:"1px 5px",fontSize:"9px",fontWeight:700,textTransform:"uppercase"}}>{h.type}</span>
                {h.stageChanged&&<span style={{fontSize:"10px",color:"#8B5CF6"}}>{h.stageChanged.from} → {h.stageChanged.to}</span>}
              </div>
              <div style={{fontSize:"12px",color:T.sub,lineHeight:1.4}}>{h.text}</div>
              {h.delayReasons?.length>0&&(
                <div style={{display:"flex",gap:"3px",marginTop:"3px",flexWrap:"wrap"}}>
                  {h.delayReasons.map(r=><span key={r} style={{background:"#FEF3C7",color:"#92400E",borderRadius:"3px",padding:"1px 5px",fontSize:"9px",fontWeight:600}}>⚑ {r}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function parseMeetingNotes(text,projectName){
  const prompt=`Parse meeting notes for KitchenAid project "${projectName}". Return ONLY JSON: {"summary":"1-2 sentences","whatChanged":"or null","decisions":[],"risks":[],"actions":[],"people":[],"stageSignal":"stage or null","delayReasons":[]}\nNotes: """${text}"""`;
  try{
    const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content:prompt}]})});
    const data=await resp.json();
    return JSON.parse((data.content?.[0]?.text||"{}").replace(/```json|```/g,"").trim());
  }catch(e){return {};}
}

function MeetingNotesPanel({project,onUpdate}){
  const [text,setText]=useState("");
  const [processing,setProcessing]=useState(false);
  const [result,setResult]=useState(null);
  const handleProcess=async()=>{if(!text.trim())return;setProcessing(true);setResult(null);setResult(await parseMeetingNotes(text,project.name));setProcessing(false);};
  const handleSave=()=>{
    if(!result)return;
    const ts=nowTs();
    const entry={id:uid(),ts,type:"meeting",text:result.summary||text.trim(),stage:project.stage,flags:result.risks||[],delayReasons:result.delayReasons||[],meetingData:result};
    onUpdate({...project,lastUpdated:ts,latestUpdate:result.whatChanged||result.summary||project.latestUpdate,history:[...(project.history||[]),entry]});
    setText("");setResult(null);
  };
  const ta={width:"100%",background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"7px",padding:"10px 12px",fontSize:"12px",color:T.text,fontFamily:"inherit",resize:"none",outline:"none",lineHeight:1.6,boxSizing:"border-box"};
  const chip=(l,tc,bg)=><span style={{background:bg,color:tc,borderRadius:"4px",padding:"2px 7px",fontSize:"10px",fontWeight:700,marginRight:"4px",display:"inline-block"}}>{l}</span>;
  return(
    <div style={{marginTop:"14px",paddingTop:"14px",borderTop:`1px solid ${T.border}`}}>
      <div style={{fontSize:"11px",color:T.muted,fontWeight:600,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.04em"}}>Meeting Notes — AI Parsed</div>
      <textarea style={{...ta,minHeight:"70px"}} value={text} onChange={e=>setText(e.target.value)} placeholder="Paste call notes, Gemini transcript, email thread…"/>
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:"6px"}}>
        <button onClick={handleProcess} disabled={!text.trim()||processing} style={{background:text.trim()&&!processing?"#2563EB":"#E5E7EB",border:"none",color:text.trim()&&!processing?"white":T.muted,borderRadius:"6px",padding:"6px 16px",cursor:text.trim()&&!processing?"pointer":"default",fontSize:"12px",fontWeight:600,fontFamily:"inherit"}}>
          {processing?"Parsing…":"Process Notes →"}
        </button>
      </div>
      {result&&(
        <div style={{marginTop:"10px",background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"8px",overflow:"hidden",fontSize:"12px"}}>
          {result.summary&&<div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`}}>{chip("Summary","#1E40AF","#DBEAFE")}<span style={{color:T.sub}}>{result.summary}</span></div>}
          {result.whatChanged&&<div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`}}>{chip("Changed","#5B21B6","#EDE9FE")}<span style={{color:T.sub}}>{result.whatChanged}</span></div>}
          {result.risks?.length>0&&<div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`}}>{chip("Risks","#991B1B","#FEE2E2")}{result.risks.map((r,i)=><div key={i} style={{color:T.sub,marginTop:"2px"}}>• {r}</div>)}</div>}
          {result.decisions?.length>0&&<div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`}}>{chip("Decisions","#065F46","#D1FAE5")}{result.decisions.map((d,i)=><div key={i} style={{color:T.sub,marginTop:"2px"}}>• {d}</div>)}</div>}
          {result.actions?.length>0&&<div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`}}>{chip("Actions","#065F46","#D1FAE5")}{result.actions.map((a,i)=><div key={i} style={{color:T.sub,marginTop:"2px"}}>• {a}</div>)}</div>}
          {result.people?.length>0&&<div style={{padding:"9px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",flexWrap:"wrap",gap:"4px",alignItems:"center"}}>{chip("People","#92400E","#FEF3C7")}{result.people.map((per,i)=><span key={i} style={{background:"white",color:T.sub,borderRadius:"20px",padding:"2px 8px",fontSize:"11px",border:`1px solid ${T.border}`}}>{per}</span>)}</div>}
          <div style={{padding:"9px 14px",display:"flex",justifyContent:"flex-end",gap:"8px"}}>
            <button onClick={()=>{setResult(null);setText("");}} style={{background:"none",border:`1px solid ${T.border}`,color:T.muted,borderRadius:"6px",padding:"6px 12px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>Discard</button>
            <button onClick={handleSave} style={{background:"#16A34A",border:"none",color:"white",borderRadius:"6px",padding:"6px 14px",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"inherit"}}>Save to Timeline ✓</button>
          </div>
        </div>
      )}
    </div>
  );
}

async function parseGlobalDump(text,projects){
  const projectList=projects.map(p=>`"${p.name}" (stage: ${p.stage}, owner: ${p.owner||"unassigned"})`).join("\n");
  const prompt=`You are parsing a full product development meeting transcript for a KitchenAid accessories company.\n\nKnown projects:\n${projectList}\n\nMeeting notes:\n"""\n${text}\n"""\n\nFor each project mentioned, return a JSON array. Each item:\n{"projectName":"exact name from list (fuzzy ok)","summary":"1-2 sentence summary","whatChanged":"specific change or null","decisions":[],"risks":[],"actions":[],"people":[],"stageSignal":"new stage or null","delayReasons":[],"actionId":"ka_responded|north_star|retailer_commit|pkg_approved|await_ka|await_factory|design_revision|t1_sent|t2_sent|t3_sent|t4_sent|needs_decision|timeline_risk or null"}\n\nOnly include projects actually mentioned. Return ONLY the JSON array.`;
  try{
    const resp=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,messages:[{role:"user",content:prompt}]})});
    const data=await resp.json();
    return JSON.parse((data.content?.[0]?.text||"[]").replace(/```json|```/g,"").trim());
  }catch(e){return [];}
}

function GlobalDumpModal({projects,onClose,onUpdateAll}){
  const [text,setText]=useState("");
  const [parsing,setParsing]=useState(false);
  const [results,setResults]=useState(null);
  const handleParse=async()=>{if(!text.trim())return;setParsing(true);setResults(null);const parsed=await parseGlobalDump(text,projects);setResults(parsed);setParsing(false);};
  const matchedCount=(results||[]).filter(r=>projects.find(p=>p.name.toLowerCase().includes(r.projectName?.toLowerCase().split(" ")[0])||r.projectName?.toLowerCase().includes(p.name.toLowerCase().split(" ")[0]))).length;
  const handleApplyAll=()=>{
    const updated=[...projects];
    (results||[]).forEach(r=>{
      const idx=updated.findIndex(p=>p.name.toLowerCase().includes(r.projectName?.toLowerCase().split(" ")[0])||r.projectName?.toLowerCase().includes(p.name.toLowerCase().split(" ")[0]));
      if(idx<0)return;
      const p=updated[idx];const ts=nowTs();
      const entry={id:uid(),ts,type:"meeting",text:r.summary||r.whatChanged||"Meeting update.",stage:p.stage,flags:r.risks||[],delayReasons:r.delayReasons||[],meetingData:r};
      let np={...p,lastUpdated:ts,latestUpdate:r.whatChanged||r.summary||p.latestUpdate,history:[...(p.history||[]),entry]};
      if(r.actionId==="await_ka")np.awaitingKA=true;
      if(r.actionId==="ka_responded")np.awaitingKA=false;
      if(r.actionId==="north_star")np.northStar=true;
      if(r.actionId==="retailer_commit")np.retailerCommit=true;
      if(r.actionId==="pkg_approved")np.pkgApproved=true;
      updated[idx]=np;
    });
    onUpdateAll(updated);onClose();
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}} onClick={onClose}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:"12px",width:"100%",maxWidth:"720px",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"18px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <div style={{fontWeight:700,fontSize:"16px",color:T.text}}>Drop Meeting Notes</div>
            <div style={{fontSize:"12px",color:T.muted,marginTop:"2px"}}>Paste your full meeting dump — AI matches projects and updates all at once</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:"22px",cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
          {!results?(
            <>
              <textarea style={{width:"100%",background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"12px",fontSize:"13px",color:T.text,fontFamily:"inherit",resize:"none",outline:"none",lineHeight:1.6,boxSizing:"border-box",minHeight:"260px"}}
                value={text} onChange={e=>setText(e.target.value)}
                placeholder={`Paste your full Gemini transcript, call notes, or email thread here…\n\nExample:\nSoft Tools — Steve signed off on hang hole revision, moving to tooling next week\nRotary Grater — KA came back, packaging approved\nTrigger Scoop — T4 still being reworked, factory says 2 more weeks`}/>
              <div style={{fontSize:"11px",color:T.muted,marginTop:"8px"}}>{projects.length} active projects · AI matches by name and extracts updates, decisions, risks, and actions</div>
            </>
          ):(
            <div>
              <div style={{fontSize:"12px",color:T.sub,marginBottom:"12px",fontWeight:600}}>Found updates for <span style={{color:T.text}}>{results.length} project{results.length!==1?"s":""}</span> — review before applying</div>
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {results.map((r,i)=>{
                  const matched=projects.find(p=>p.name.toLowerCase().includes(r.projectName?.toLowerCase().split(" ")[0])||r.projectName?.toLowerCase().includes(p.name.toLowerCase().split(" ")[0]));
                  const stageC=matched?STAGE_COLORS[matched.stage]||T.muted:T.muted;
                  return(
                    <div key={i} style={{background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"12px 14px"}}>
                      <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"6px",flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:"13px",color:T.text}}>{r.projectName}</span>
                        {matched&&<span style={{background:`${stageC}18`,color:stageC,border:`1px solid ${stageC}44`,borderRadius:"20px",padding:"2px 8px",fontSize:"10px",fontWeight:700,textTransform:"uppercase"}}>{matched.stage}</span>}
                        {r.stageSignal&&r.stageSignal!==matched?.stage&&<span style={{background:"#EDE9FE",color:"#5B21B6",borderRadius:"4px",padding:"2px 7px",fontSize:"10px",fontWeight:700}}>→ {r.stageSignal}</span>}
                        {!matched&&<span style={{background:"#FEF3C7",color:"#92400E",borderRadius:"4px",padding:"2px 7px",fontSize:"10px",fontWeight:600}}>No match</span>}
                      </div>
                      {r.summary&&<div style={{fontSize:"12px",color:T.sub,marginBottom:"6px",lineHeight:1.4}}>{r.summary}</div>}
                      <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                        {r.decisions?.length>0&&<span style={{background:"#D1FAE5",color:"#065F46",borderRadius:"4px",padding:"2px 7px",fontSize:"10px",fontWeight:600}}>{r.decisions.length} decision{r.decisions.length!==1?"s":""}</span>}
                        {r.risks?.length>0&&<span style={{background:"#FEE2E2",color:"#991B1B",borderRadius:"4px",padding:"2px 7px",fontSize:"10px",fontWeight:600}}>{r.risks.length} risk{r.risks.length!==1?"s":""}</span>}
                        {r.actions?.length>0&&<span style={{background:"#DBEAFE",color:"#1E40AF",borderRadius:"4px",padding:"2px 7px",fontSize:"10px",fontWeight:600}}>{r.actions.length} action{r.actions.length!==1?"s":""}</span>}
                        {r.delayReasons?.map(d=><span key={d} style={{background:"#FEF3C7",color:"#92400E",borderRadius:"4px",padding:"2px 7px",fontSize:"10px",fontWeight:600}}>⚑ {d}</span>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,background:"#F9FAFB",borderRadius:"0 0 12px 12px"}}>
          <button onClick={()=>{setResults(null);setText("");onClose();}} style={{background:"none",border:`1px solid ${T.border}`,color:T.muted,borderRadius:"7px",padding:"8px 16px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>Cancel</button>
          <div style={{display:"flex",gap:"8px"}}>
            {!results?(
              <button onClick={handleParse} disabled={!text.trim()||parsing} style={{background:text.trim()&&!parsing?"#2563EB":"#E5E7EB",border:"none",color:text.trim()&&!parsing?"white":T.muted,borderRadius:"7px",padding:"8px 20px",cursor:text.trim()&&!parsing?"pointer":"default",fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>
                {parsing?"Parsing…":"Process Notes →"}
              </button>
            ):(
              <>
                <button onClick={()=>setResults(null)} style={{background:"none",border:`1px solid ${T.border}`,color:T.sub,borderRadius:"7px",padding:"8px 16px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>Back</button>
                <button onClick={handleApplyAll} disabled={matchedCount===0} style={{background:"#16A34A",border:"none",color:"white",borderRadius:"7px",padding:"8px 20px",cursor:"pointer",fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>
                  Apply {matchedCount} Update{matchedCount!==1?"s":""} ✓
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineDualView({p}){
  const order=["Kickoff","North Star","Concept","Design","Tooling","KA Review","Pkg Approval","Production","Launch"];
  const {slipDays,projectedLaunch,projected,baseline}=calcProjectedDates(p);
  if(!p.launchDate)return<div style={{fontSize:"11px",color:T.muted,padding:"8px 0"}}>Add a target first sale date to see timeline.</div>;
  const ci=order.indexOf(p.stage);
  return(
    <div>
      {slipDays>0?(
        <div style={{background:"#FEE2E2",border:"1px solid #FECACA",borderRadius:"6px",padding:"8px 12px",marginBottom:"10px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"6px"}}>
          <span style={{fontSize:"12px",color:"#991B1B",fontWeight:700}}>⚠ {slipDays}-day slip</span>
          <span style={{fontSize:"11px",color:"#B91C1C"}}>Original: <strong>{fmtDate(p.launchDate)}</strong> → Projected: <strong>{fmtDate(projectedLaunch)}</strong></span>
        </div>
      ):(
        <div style={{background:"#DCFCE7",border:"1px solid #BBF7D0",borderRadius:"6px",padding:"8px 12px",marginBottom:"10px",fontSize:"12px",color:"#166534",fontWeight:600}}>✓ On track for {fmtDate(p.launchDate)}</div>
      )}
      <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
        {order.map((s,i)=>{
          const c=STAGE_META[s]?.color||T.muted,isActive=i===ci,isPast=i<ci;
          const limit=STAGE_META[s]?.days||0,dis=daysAgo(p.stageEnteredAt);
          const actualDur=(p.stageHistory||[]).find(h=>h.stage===s)?.duration;
          const projDate=projected?.[s]?.start,baseDate=baseline?.[s];
          const fillPct=isActive?Math.min(100,Math.round((dis/Math.max(1,limit))*100)):isPast?100:0;
          const barColor=isActive?(dis>limit?T.risk:dis>limit*0.7?T.warning:c):isPast?c:"#E5E7EB";
          return(
            <div key={s} style={{display:"grid",gridTemplateColumns:"100px 1fr 120px",gap:"8px",alignItems:"center"}}>
              <div style={{fontSize:"11px",color:isActive?c:isPast?T.sub:T.muted,fontWeight:isActive?700:400,textAlign:"right"}}>{s}</div>
              <div>
                <div style={{height:"3px",background:"#E5E7EB",borderRadius:"2px",marginBottom:"2px"}}><div style={{height:"100%",width:isPast||isActive?"100%":"0%",background:c,opacity:0.3,borderRadius:"2px"}}/></div>
                <div style={{height:"7px",background:"#E5E7EB",borderRadius:"4px",overflow:"hidden"}}><div style={{height:"100%",width:`${fillPct}%`,background:barColor,borderRadius:"4px"}}/></div>
              </div>
              <div style={{fontSize:"10px",display:"flex",flexDirection:"column",gap:"1px"}}>
                {baseDate&&<span style={{color:T.muted}}>Plan {fmtDate(baseDate)}</span>}
                {isActive&&<span style={{color:dis>limit?T.risk:c,fontWeight:600}}>{dis}d / {limit}d</span>}
                {isPast&&actualDur!=null&&<span style={{color:actualDur>limit?T.risk:T.sub}}>{actualDur}d actual</span>}
                {i>ci&&projDate&&slipDays>0&&<span style={{color:T.warning,fontWeight:600}}>Proj {fmtDate(projDate)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailModal({p,onClose,onUpdate}){
  const flags=computeFlags(p),risk=launchRisk(p);
  const dis=daysAgo(p.stageEnteredAt),stageC=STAGE_META[p.stage]?.color||T.muted;
  return(
    <Modal onClose={onClose} wide>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"14px"}}>
        <div>
          <div style={{fontWeight:700,fontSize:"18px",color:T.text,letterSpacing:"-0.02em",marginBottom:"5px"}}>{p.name}</div>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",alignItems:"center"}}>
            <span style={{background:`${stageC}18`,color:stageC,border:`1px solid ${stageC}44`,borderRadius:"20px",padding:"3px 10px",fontSize:"10px",fontWeight:700,textTransform:"uppercase"}}>{p.stage}</span>
            {p.type==="multi-sku"&&<span style={{background:"#EDE9FE",color:"#5B21B6",borderRadius:"4px",padding:"2px 7px",fontSize:"11px",fontWeight:600}}>{p.skuCount} SKUs</span>}
            <span style={{fontSize:"12px",color:T.sub}}>{p.owner||"Unassigned"}</span>
            {p.region&&<span style={{fontSize:"11px",color:T.muted,background:"#F3F4F6",borderRadius:"4px",padding:"2px 7px"}}>{p.region}</span>}
            {p.annualVolume&&<span style={{fontSize:"11px",color:T.muted,background:"#F3F4F6",borderRadius:"4px",padding:"2px 7px"}}>{p.annualVolume}</span>}
          </div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:"22px",cursor:"pointer",lineHeight:1}}>×</button>
      </div>
      <div style={{background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"6px",padding:"7px 12px",marginBottom:"12px",fontSize:"11px",color:T.muted}}>🔒 Core fields locked after kickoff. Use the update menu to make changes.</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px",marginBottom:"12px"}}>
        {[["In Stage",`${dis}d`,dis>(STAGE_META[p.stage]?.days||30)?T.risk:T.text],["Total",`${daysAgo(p.createdAt)}d`,T.text],["Revisions",p.revisions||0,(p.revisions||0)>=3?T.risk:T.text],["Updated",`${daysAgo(p.lastUpdated)}d ago`,daysAgo(p.lastUpdated)>INACTIVITY_DAYS?T.warning:T.text]].map(([l,v,c])=>(
          <div key={l} style={{background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"6px",padding:"9px",textAlign:"center"}}>
            <div style={{fontSize:"9px",color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600,marginBottom:"3px"}}>{l}</div>
            <div style={{fontSize:"16px",fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>
      {(flags.risk.length+flags.biz.length)>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:"4px",marginBottom:"12px"}}>
          {flags.risk.map(f=><span key={f} style={{background:"#FEE2E2",color:"#991B1B",borderRadius:"4px",padding:"2px 8px",fontSize:"10px",fontWeight:600}}>{f}</span>)}
          {flags.biz.map(f=><span key={f} style={{background:"#FEF3C7",color:"#92400E",borderRadius:"4px",padding:"2px 8px",fontSize:"10px",fontWeight:600}}>{f}</span>)}
        </div>
      )}
      <div style={{border:`1px solid ${T.border}`,borderRadius:"8px",padding:"14px",marginBottom:"14px"}}>
        <div style={{fontSize:"11px",color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600,marginBottom:"10px"}}>Timeline — Baseline vs Projection</div>
        <TimelineDualView p={p}/>
      </div>
      <div style={{borderTop:`1px solid ${T.border}`,paddingTop:"14px"}}>
        <div style={{fontSize:"11px",color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:"8px"}}>Post Update</div>
        <UpdatePanel project={p} onUpdate={onUpdate}/>
      </div>
      <MeetingNotesPanel project={p} onUpdate={onUpdate}/>
      <div style={{marginTop:"14px",borderTop:`1px solid ${T.border}`,paddingTop:"12px"}}>
        <HistoryPanel history={p.history}/>
      </div>
    </Modal>
  );
}

function SearchModal({projects,onClose,onSelect}){
  const [q,setQ]=useState("");
  const results=q.trim().length<2?[]:(()=>{
    const term=q.toLowerCase(),hits=[];
    projects.forEach(p=>{
      (p.history||[]).forEach(h=>{
        const blob=[h.text,h.meetingData?.summary,...(h.meetingData?.decisions||[]),...(h.meetingData?.risks||[]),...(h.delayReasons||[])].filter(Boolean).join(" ").toLowerCase();
        if(blob.includes(term))hits.push({entry:h,project:p});
      });
      if(p.name.toLowerCase().includes(term)||p.latestUpdate?.toLowerCase().includes(term))hits.push({entry:{ts:p.lastUpdated,type:"project",text:p.latestUpdate||p.name},project:p});
    });
    return[...new Map(hits.map(h=>[h.entry.id||h.project.id+h.entry.ts,h])).values()].sort((a,b)=>new Date(b.entry.ts)-new Date(a.entry.ts)).slice(0,25);
  })();
  return(
    <Modal onClose={onClose} wide>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
        <div style={{fontWeight:700,fontSize:"15px",color:T.text}}>Search</div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:"22px",cursor:"pointer"}}>×</button>
      </div>
      <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search projects, notes, decisions, risks…"
        style={{width:"100%",background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"10px 14px",fontSize:"13px",color:T.text,fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:"12px"}}/>
      {q.trim().length>=2&&<div style={{fontSize:"10px",color:T.muted,marginBottom:"8px",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>{results.length} result{results.length!==1?"s":""}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:"5px",maxHeight:"380px",overflowY:"auto"}}>
        {results.map((r,i)=>{
          const stageC=STAGE_META[r.project.stage]?.color||T.muted;
          return(
            <div key={i} onClick={()=>{onSelect(r.project);onClose();}} style={{background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"8px",padding:"9px 14px",cursor:"pointer"}}>
              <div style={{display:"flex",gap:"8px",alignItems:"center",marginBottom:"3px",flexWrap:"wrap"}}>
                <span style={{fontWeight:600,fontSize:"13px",color:T.text}}>{r.project.name}</span>
                <span style={{background:`${stageC}18`,color:stageC,borderRadius:"20px",padding:"2px 8px",fontSize:"10px",fontWeight:700,textTransform:"uppercase"}}>{r.project.stage}</span>
                <span style={{fontSize:"10px",color:T.muted,marginLeft:"auto"}}>{fmtDate(r.entry.ts)}</span>
              </div>
              <div style={{fontSize:"12px",color:T.sub,lineHeight:1.4}}>{r.entry.text}</div>
            </div>
          );
        })}
        {q.trim().length>=2&&results.length===0&&<div style={{textAlign:"center",padding:"28px",color:T.muted,fontSize:"13px"}}>No results for "{q}"</div>}
      </div>
    </Modal>
  );
}

function KickoffModal({onSave,onClose}){
  const [form,setForm]=useState({name:"",type:"single",skuCount:1,stage:"Kickoff",owner:"",launchDate:"",kaContact:"",region:"",annualVolume:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const inp={background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"7px",padding:"9px 12px",fontSize:"13px",color:T.text,width:"100%",boxSizing:"border-box",fontFamily:"inherit",outline:"none"};
  const lbl={fontSize:"10px",color:T.muted,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",display:"block",marginBottom:"5px"};
  const gates=calcGateDates(form.launchDate);
  const stageKeys=["Kickoff","North Star","Concept","Design","Tooling","KA Review","Pkg Approval","Production","Launch"];
  const canSave=form.name.trim()&&form.owner;
  const handleSave=()=>{
    if(!canSave)return;
    const n=nowTs();
    onSave({...form,id:uid(),createdAt:n,stageEnteredAt:n,lastUpdated:n,northStar:false,tSample:0,awaitingKA:false,retailerCommit:false,pkgApproved:false,revenueScore:5,revisions:0,latestUpdate:"",
      history:buildHistory([{ts:n,type:"created",text:`Project created at ${form.stage}.`,stage:form.stage,flags:[],delayReasons:[]}]),
      stageHistory:[{stage:form.stage,entered:n,exited:null,duration:null}]});
    onClose();
  };
  return(
    <Modal onClose={onClose}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
        <div>
          <div style={{fontWeight:700,fontSize:"16px",color:T.text}}>New Initiative</div>
          <div style={{fontSize:"11px",color:T.muted,marginTop:"2px"}}>Fill once — fields lock after creation</div>
        </div>
        <button onClick={onClose} style={{background:"none",border:"none",color:T.muted,fontSize:"22px",cursor:"pointer"}}>×</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:"13px"}}>
        <div><label style={lbl}>Project Name *</label><input style={inp} value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Soft Tools Line"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
          <div><label style={lbl}>Owner (CM) *</label><select style={inp} value={form.owner} onChange={e=>set("owner",e.target.value)}><option value="">Select owner</option>{OWNERS.map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label style={lbl}>KitchenAid Contact</label><select style={inp} value={form.kaContact} onChange={e=>set("kaContact",e.target.value)}><option value="">Select</option>{KA_CONTACTS.map(k=><option key={k}>{k}</option>)}</select></div>
        </div>
        <div><label style={lbl}>Target First Sale Date — when you want to be in market</label><input type="date" style={inp} value={form.launchDate} onChange={e=>set("launchDate",e.target.value)}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
          <div><label style={lbl}>Program Type</label><select style={inp} value={form.type} onChange={e=>set("type",e.target.value)}><option value="single">Single Project</option><option value="multi-sku">Multi-SKU Program</option></select></div>
          {form.type==="multi-sku"&&<div><label style={lbl}>SKU Count</label><input type="number" style={inp} min="1" value={form.skuCount} onChange={e=>set("skuCount",+e.target.value)}/></div>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
          <div><label style={lbl}>Region</label><select style={inp} value={form.region} onChange={e=>set("region",e.target.value)}><option value="">Select</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</select></div>
          <div><label style={lbl}>Est. Annual Volume</label><select style={inp} value={form.annualVolume} onChange={e=>set("annualVolume",e.target.value)}><option value="">Select</option>{VOLUME_RANGES.map(v=><option key={v}>{v}</option>)}</select></div>
        </div>
        <div><label style={lbl}>Starting Stage</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
            {STAGES.filter(s=>!["Killed","Paused"].includes(s)).map(s=>{const c=STAGE_META[s]?.color||T.muted;return<button key={s} onClick={()=>set("stage",s)} style={{background:form.stage===s?`${c}18`:"transparent",color:form.stage===s?c:T.muted,border:`1px solid ${form.stage===s?c+"55":T.border}`,borderRadius:"20px",padding:"4px 10px",fontSize:"10px",cursor:"pointer",fontWeight:form.stage===s?700:400,textTransform:"uppercase",fontFamily:"inherit"}}>{s}</button>;})}
          </div>
        </div>
        {form.stage!=="Kickoff"&&<div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:"7px",padding:"9px 12px",fontSize:"11px",color:"#92400E"}}>⚠ Contact the owner for history on prior stages.</div>}
        {form.launchDate&&<div style={{background:"#F9FAFB",border:`1px solid ${T.border}`,borderRadius:"7px",padding:"11px"}}>
          <div style={{fontSize:"10px",color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600,marginBottom:"7px"}}>Auto gate schedule</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px"}}>
            {stageKeys.map(s=>gates[s]&&<div key={s} style={{display:"flex",justifyContent:"space-between",fontSize:"11px",padding:"2px 0"}}><span style={{color:T.muted}}>{s}</span><span style={{color:new Date(gates[s])<tod()?"#991B1B":"#166534",fontWeight:600}}>{fmtDate(gates[s])}</span></div>)}
          </div>
        </div>}
      </div>
      <div style={{display:"flex",gap:"8px",marginTop:"16px",justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{background:"none",border:`1px solid ${T.border}`,color:T.muted,borderRadius:"7px",padding:"9px 16px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>Cancel</button>
        <button onClick={handleSave} disabled={!canSave} style={{background:canSave?"#2563EB":"#E5E7EB",border:"none",color:canSave?"white":T.muted,borderRadius:"7px",padding:"9px 20px",cursor:canSave?"pointer":"default",fontSize:"13px",fontWeight:700,fontFamily:"inherit"}}>Create & Lock →</button>
      </div>
    </Modal>
  );
}

function computeAnalytics(projects){
  const active=projects.filter(p=>!["Killed","Launch"].includes(p.stage));
  const totalPipeline=active.reduce((a,p)=>a+volOf(p),0);
  const atRiskProjects=active.filter(p=>{const f=computeFlags(p),r=launchRisk(p);return r?.at||f.risk.includes("Stuck in stage");});
  const valueAtRisk=atRiskProjects.reduce((a,p)=>a+volOf(p),0);
  const slippedProjects=active.filter(p=>calcProjectedDates(p).slipDays>0);
  const totalSlipDays=slippedProjects.reduce((a,p)=>a+calcProjectedDates(p).slipDays,0);
  const totalSlipWeeks=Math.round(totalSlipDays/7);
  const avgSlip=slippedProjects.length?Math.round(totalSlipDays/slippedProjects.length):0;
  const longestSlip=slippedProjects.reduce((a,p)=>{const s=calcProjectedDates(p).slipDays;return s>a.days?{name:p.name,days:s}:a;},{name:"—",days:0});
  const valueByStage={},valueByOwner={};
  active.forEach(p=>{valueByStage[p.stage]=(valueByStage[p.stage]||0)+volOf(p);if(p.owner)valueByOwner[p.owner]=(valueByOwner[p.owner]||0)+volOf(p);});
  const stageDurations={},stageSlips={};
  projects.forEach(p=>{(p.stageHistory||[]).forEach(sh=>{if(sh.duration!=null){if(!stageDurations[sh.stage])stageDurations[sh.stage]=[];stageDurations[sh.stage].push(sh.duration);const limit=STAGE_META[sh.stage]?.days||0;if(sh.duration>limit&&limit>0){if(!stageSlips[sh.stage])stageSlips[sh.stage]=[];stageSlips[sh.stage].push(sh.duration-limit);}}});});
  const avgByStage=Object.entries(stageDurations).map(([stage,arr])=>({stage,avg:Math.round(arr.reduce((a,v)=>a+v,0)/arr.length),count:arr.length,limit:STAGE_META[stage]?.days||0,avgSlip:stageSlips[stage]?Math.round(stageSlips[stage].reduce((a,v)=>a+v,0)/stageSlips[stage].length):0,slipCount:stageSlips[stage]?.length||0})).sort((a,b)=>b.avgSlip-a.avgSlip);
  let daysAwaitingKA=0,daysAwaitingRetailer=0,kaCount=0,retailerCount=0;
  active.forEach(p=>{if(p.awaitingKA){daysAwaitingKA+=daysAgo(p.lastUpdated);kaCount++;}if(!p.retailerCommit&&["Tooling","KA Review","Production"].includes(p.stage)){daysAwaitingRetailer+=daysAgo(p.stageEnteredAt);retailerCount++;}});
  const externalDelays=kaCount+retailerCount,totalDelays=externalDelays||1;
  const ownerStats={};
  OWNERS.forEach(o=>{const op=active.filter(p=>p.owner===o);const delayed=op.filter(p=>calcProjectedDates(p).slipDays>0||computeFlags(p).risk.includes("Stuck in stage"));ownerStats[o]={count:op.length,value:op.reduce((a,p)=>a+volOf(p),0),delayed:delayed.length,revisions:op.reduce((a,p)=>a+(p.revisions||0),0),overloaded:op.length>=4||delayed.length>=2};});
  const skuComplexity=active.filter(p=>p.type==="multi-sku").map(p=>({name:p.name,skuCount:p.skuCount||1,slip:calcProjectedDates(p).slipDays,atRisk:launchRisk(p)?.at||false})).sort((a,b)=>b.skuCount-a.skuCount);
  const paused=projects.filter(p=>p.stage==="Paused"),killed=projects.filter(p=>p.stage==="Killed");
  const avgDaysBeforePause=paused.length?Math.round(paused.reduce((a,p)=>a+daysAgo(p.createdAt),0)/paused.length):0;
  const avgDaysBeforeKill=killed.length?Math.round(killed.reduce((a,p)=>a+daysAgo(p.createdAt),0)/killed.length):0;
  const wastedValue=[...paused,...killed].reduce((a,p)=>a+volOf(p),0);
  return{totalPipeline,valueAtRisk,totalSlipWeeks,slippedCount:slippedProjects.length,avgSlip,longestSlip,atRiskProjects,valueByStage,valueByOwner,avgByStage,daysAwaitingKA:kaCount?Math.round(daysAwaitingKA/kaCount):0,daysAwaitingRetailer:retailerCount?Math.round(daysAwaitingRetailer/retailerCount):0,externalPct:Math.round((externalDelays/totalDelays)*100),internalPct:100-Math.round((externalDelays/totalDelays)*100),ownerStats,skuComplexity,paused:paused.length,killed:killed.length,avgDaysBeforePause,avgDaysBeforeKill,wastedValue,activeCount:active.length};
}

function AnalyticsView({projects}){
  const a=computeAnalytics(projects);
  const lbl={fontSize:"10px",color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600,marginBottom:"10px",display:"block"};
  const stageOrder=["Kickoff","North Star","Concept","Design","Tooling","KA Review","Pkg Approval","Production"];
  const stageValMax=stageOrder.reduce((m,s)=>Math.max(m,a.valueByStage[s]||0),1);
  const ownerValMax=Object.values(a.valueByOwner).reduce((m,v)=>Math.max(m,v),1);
  const bx=(extra={})=>({background:T.card,border:`1px solid ${T.border}`,borderRadius:"8px",padding:"14px",...extra});
  const HBar=({label,value,max,color,sub})=>(
    <div style={{marginBottom:"8px"}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"3px"}}>
        <span style={{color:T.text,fontWeight:500}}>{label}</span>
        <span style={{color:T.sub}}>{typeof value==="number"?fmtVal(value):value}{sub&&<span style={{color:T.muted}}> {sub}</span>}</span>
      </div>
      <div style={{height:"6px",background:"#E5E7EB",borderRadius:"3px",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(100,(value/max)*100)}%`,background:color||T.active,borderRadius:"3px"}}/>
      </div>
    </div>
  );
  const ExecCard=({label,value,sub,color,warn})=>(
    <div style={{...bx(),textAlign:"center",borderTop:`3px solid ${color||T.active}`}}>
      <div style={{fontSize:"10px",color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600,marginBottom:"6px"}}>{label}</div>
      <div style={{fontSize:"28px",fontWeight:800,color:warn?T.risk:color||T.text,lineHeight:1,marginBottom:"3px"}}>{value}</div>
      {sub&&<div style={{fontSize:"11px",color:T.muted}}>{sub}</div>}
    </div>
  );
  return(
    <div style={{padding:"16px 20px 40px",display:"flex",flexDirection:"column",gap:"14px"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
        <ExecCard label="Total Pipeline Value" value={fmtVal(a.totalPipeline)} sub={`${a.activeCount} active initiatives`} color={T.active}/>
        <ExecCard label="Value at Risk" value={fmtVal(a.valueAtRisk)} sub={`${a.atRiskProjects.length} projects flagged`} color={T.risk} warn={a.valueAtRisk>0}/>
        <ExecCard label="Total Weeks Slipped" value={`${a.totalSlipWeeks}w`} sub={`across ${a.slippedCount} projects`} color={T.warning} warn={a.totalSlipWeeks>4}/>
        <ExecCard label="Projects Delayed" value={a.slippedCount} sub={`avg ${a.avgSlip}d per project`} color={T.warning} warn={a.slippedCount>2}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
        <div style={bx()}>
          <span style={lbl}>Pipeline value by stage</span>
          {stageOrder.map(s=>a.valueByStage[s]>0&&<HBar key={s} label={s} value={a.valueByStage[s]} max={stageValMax} color={STAGE_COLORS[s]}/>)}
          {!Object.keys(a.valueByStage).length&&<div style={{fontSize:"12px",color:T.muted}}>No volume data — add annual volume to kickoff forms</div>}
        </div>
        <div style={bx()}>
          <span style={lbl}>Pipeline value by owner</span>
          {OWNERS.map(o=><HBar key={o} label={o.split(" ")[0]} value={a.valueByOwner[o]||0} max={ownerValMax} color={T.active} sub={`${projects.filter(p=>p.owner===o&&!["Killed","Launch"].includes(p.stage)).length} projects`}/>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"}}>
        <div style={bx()}>
          <span style={lbl}>Delay by stage</span>
          {a.avgByStage.length>0?a.avgByStage.map(s=>{const c=STAGE_COLORS[s.stage]||T.muted,over=s.avg>s.limit&&s.limit>0;return(
            <div key={s.stage} style={{marginBottom:"9px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"3px"}}>
                <span style={{color:T.text,fontWeight:500}}>{s.stage}</span>
                <span style={{color:over?T.risk:T.sub,fontWeight:over?700:400}}>{s.avg}d<span style={{color:T.muted}}>/{s.limit}d</span>{s.slipCount>0&&<span style={{color:T.risk}}> +{s.avgSlip}d</span>}</span>
              </div>
              <div style={{height:"5px",background:"#E5E7EB",borderRadius:"3px",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(s.avg/Math.max(1,s.limit))*100)}%`,background:over?T.risk:c,borderRadius:"3px"}}/></div>
            </div>
          );}):<div style={{fontSize:"12px",color:T.muted}}>No stage history yet</div>}
        </div>
        <div style={bx()}>
          <span style={lbl}>Decision latency</span>
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            {[["Avg days awaiting KA",a.daysAwaitingKA,T.risk],["Avg days awaiting retailer",a.daysAwaitingRetailer,T.warning]].map(([l,v,c])=>(
              <div key={l}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"4px"}}><span style={{color:T.text}}>{l}</span><span style={{color:v>14?T.risk:T.sub,fontWeight:v>14?700:400}}>{v}d</span></div>
                <div style={{height:"5px",background:"#E5E7EB",borderRadius:"3px",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(v/60)*100)}%`,background:c,borderRadius:"3px"}}/></div>
              </div>
            ))}
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:"10px"}}>
              <div style={{fontSize:"11px",color:T.muted,marginBottom:"6px",fontWeight:600}}>External vs internal</div>
              <div style={{height:"10px",background:"#E5E7EB",borderRadius:"5px",overflow:"hidden",display:"flex"}}>
                <div style={{height:"100%",width:`${a.externalPct}%`,background:T.risk}}/>
                <div style={{height:"100%",width:`${a.internalPct}%`,background:T.warning}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:T.muted,marginTop:"4px"}}>
                <span style={{color:T.risk}}>External {a.externalPct}%</span>
                <span style={{color:T.warning}}>Internal {a.internalPct}%</span>
              </div>
            </div>
          </div>
        </div>
        <div style={bx()}>
          <span style={lbl}>Slip summary</span>
          <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
            {[["Avg slip per project",`${a.avgSlip}d`,a.avgSlip>21?T.risk:T.sub],["Total slip this period",`${a.totalSlipWeeks}w`,a.totalSlipWeeks>8?T.risk:T.sub],["Projects over 30d slip",`${projects.filter(p=>calcProjectedDates(p).slipDays>30).length}`,T.risk],["Longest slipping",a.longestSlip.name,T.sub],["Days slipped (longest)",`${a.longestSlip.days}d`,a.longestSlip.days>30?T.risk:T.sub]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"12px",padding:"4px 0",borderBottom:`1px solid ${T.border}`}}>
                <span style={{color:T.sub}}>{l}</span><span style={{color:c,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"}}>
        <div style={bx()}>
          <span style={lbl}>Owner load</span>
          {OWNERS.map(o=>{const s=a.ownerStats[o];return(
            <div key={o} style={{marginBottom:"12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                <span style={{fontSize:"12px",color:T.text,fontWeight:600}}>{o.split(" ")[0]}</span>
                {s.overloaded&&<span style={{background:"#FEE2E2",color:"#991B1B",borderRadius:"4px",padding:"1px 6px",fontSize:"9px",fontWeight:700}}>OVERLOADED</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px"}}>
                {[["Projects",s.count,s.count>=4?T.risk:T.sub],["Value",fmtVal(s.value),T.active],["Delayed",s.delayed,s.delayed>=2?T.risk:T.sub],["Revisions",s.revisions,s.revisions>=3?T.warning:T.sub]].map(([l,v,c])=>(
                  <div key={l} style={{background:"#F9FAFB",borderRadius:"5px",padding:"5px 8px",border:`1px solid ${T.border}`}}>
                    <div style={{fontSize:"9px",color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</div>
                    <div style={{fontSize:"13px",fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );})}
        </div>
        <div style={bx()}>
          <span style={lbl}>SKU complexity vs delay</span>
          {a.skuComplexity.length>0?a.skuComplexity.map(p=>(
            <div key={p.name} style={{marginBottom:"10px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:"3px"}}>
                <span style={{color:T.text,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"130px"}}>{p.name}</span>
                <span style={{display:"flex",gap:"5px",flexShrink:0}}>
                  <span style={{color:T.muted}}>{p.skuCount} SKUs</span>
                  {p.slip>0&&<span style={{color:T.risk,fontWeight:700}}>+{p.slip}d</span>}
                  {p.atRisk&&<span style={{background:"#FEE2E2",color:"#991B1B",borderRadius:"3px",padding:"1px 5px",fontSize:"9px",fontWeight:700}}>AT RISK</span>}
                </span>
              </div>
              <div style={{height:"5px",background:"#E5E7EB",borderRadius:"3px",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,(p.skuCount/30)*100)}%`,background:p.atRisk?T.risk:p.slip>0?T.warning:"#8B5CF6",borderRadius:"3px"}}/></div>
            </div>
          )):<div style={{fontSize:"12px",color:T.muted}}>No multi-SKU programs yet</div>}
        </div>
        <div style={bx()}>
          <span style={lbl}>Pause & kill analytics</span>
          <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"12px"}}>
            {[["Projects paused",a.paused,a.paused>2?T.warning:T.sub],["Avg days before pause",`${a.avgDaysBeforePause}d`,T.sub],["Projects killed",a.killed,a.killed>1?T.risk:T.sub],["Avg days before kill",`${a.avgDaysBeforeKill}d`,T.sub]].map(([l,v,c])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:"12px",padding:"4px 0",borderBottom:`1px solid ${T.border}`}}>
                <span style={{color:T.sub}}>{l}</span><span style={{color:c,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:"#FEF3C7",border:"1px solid #FDE68A",borderRadius:"6px",padding:"10px 12px"}}>
            <div style={{fontSize:"10px",color:"#92400E",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700,marginBottom:"3px"}}>Wasted pipeline value</div>
            <div style={{fontSize:"22px",fontWeight:800,color:"#92400E"}}>{fmtVal(a.wastedValue)}</div>
            <div style={{fontSize:"10px",color:"#B45309",marginTop:"2px"}}>from paused + killed projects</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({p,onClick,onUpdate}){
  const flags=computeFlags(p),risk=launchRisk(p);
  const sc=getStatusColor(p,flags,risk);
  const dis=daysAgo(p.stageEnteredAt),max=STAGE_META[p.stage]?.days||30;
  const pct=Math.min(100,Math.round((dis/Math.max(1,max))*100));
  const barColor=pct>=100?T.risk:pct>70?T.warning:STAGE_META[p.stage]?.color||T.active;
  const {slipDays}=calcProjectedDates(p);
  const inactive=daysAgo(p.lastUpdated)>INACTIVITY_DAYS;
  const stageC=STAGE_META[p.stage]?.color||T.muted;
  return(
    <div style={{background:T.card,borderRadius:"8px",border:`1px solid ${T.border}`,borderLeft:`4px solid ${sc}`,marginBottom:"6px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
      <div style={{display:"flex"}}>
        <div style={{flex:1,padding:"12px 14px",cursor:"pointer",minWidth:0}} onClick={onClick}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"5px"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap",marginBottom:"4px"}}>
                <span style={{fontWeight:600,fontSize:"15px",color:T.text,letterSpacing:"-0.01em"}}>{p.name}</span>
                {p.type==="multi-sku"&&<span style={{fontSize:"10px",color:"#5B21B6",background:"#EDE9FE",borderRadius:"4px",padding:"1px 6px",fontWeight:600,whiteSpace:"nowrap"}}>{p.skuCount} SKUs</span>}
              </div>
              <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
                <span style={{background:`${stageC}18`,color:stageC,border:`1px solid ${stageC}44`,borderRadius:"20px",padding:"2px 9px",fontSize:"10px",fontWeight:700,textTransform:"uppercase",whiteSpace:"nowrap"}}>{p.stage}</span>
                <span style={{fontSize:"12px",color:T.sub,whiteSpace:"nowrap"}}>{p.owner||<span style={{color:T.risk}}>No owner</span>}</span>
                <span style={{fontSize:"12px",color:slipDays>0?T.risk:daysUntil(p.launchDate||"9999")<=45?T.warning:T.muted,whiteSpace:"nowrap"}}>
                  {p.launchDate?`Launch ${fmtDate(p.launchDate)}`:"No date"}
                  {slipDays>0&&<span style={{fontWeight:700}}> (+{slipDays}d slip)</span>}
                </span>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0,marginLeft:"12px"}}>
              <div style={{fontSize:"30px",fontWeight:700,color:pct>=100?T.risk:pct>70?T.warning:T.text,lineHeight:1}}>{dis}</div>
              <div style={{fontSize:"9px",color:T.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>days</div>
            </div>
          </div>
          {p.latestUpdate&&<div style={{fontSize:"12px",color:T.sub,lineHeight:1.4,marginBottom:"7px",paddingLeft:"8px",borderLeft:`2px solid ${T.border}`}}>{p.latestUpdate}</div>}
          <div style={{marginBottom:"6px"}}>
            <div style={{height:"8px",background:"#E5E7EB",borderRadius:"4px",overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:barColor,borderRadius:"4px"}}/></div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:T.muted,marginTop:"3px"}}>
              <span>{max}d limit</span>
              <span style={{color:pct>=100?T.risk:pct>70?T.warning:T.muted,fontWeight:pct>=100?700:400}}>{pct}%</span>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"4px"}}>
            <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
              {inactive&&<span style={{background:"#FEF3C7",color:"#92400E",borderRadius:"4px",padding:"2px 6px",fontSize:"10px",fontWeight:600}}>No activity {daysAgo(p.lastUpdated)}d</span>}
              {flags.risk.filter(f=>f!=="No recent activity").slice(0,2).map(f=><span key={f} style={{background:"#FEE2E2",color:"#991B1B",borderRadius:"4px",padding:"2px 6px",fontSize:"10px",fontWeight:600}}>{f}</span>)}
              {flags.biz.slice(0,1).map(f=><span key={f} style={{background:"#FEF3C7",color:"#92400E",borderRadius:"4px",padding:"2px 6px",fontSize:"10px",fontWeight:600}}>{f}</span>)}
            </div>
            <span style={{fontSize:"10px",color:T.muted}}>Updated {daysAgo(p.lastUpdated)}d ago</span>
          </div>
        </div>
        <div style={{width:"300px",flexShrink:0,borderLeft:`1px solid ${T.border}`,padding:"10px 14px",display:"flex",flexDirection:"column",gap:"8px"}} onClick={e=>e.stopPropagation()}>
          <UpdatePanel project={p} onUpdate={onUpdate}/>
          <HistoryPanel history={p.history}/>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const [projects,setProjects]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [selected,setSelected]=useState(null);
  const [showKickoff,setShowKickoff]=useState(false);
  const [showSearch,setShowSearch]=useState(false);
  const [showDump,setShowDump]=useState(false);
  const [view,setView]=useState("dashboard");
  const [filter,setFilter]=useState(null);
  const [ownerFilter,setOwnerFilter]=useState("All");

  useEffect(()=>{loadPersistedProjects().then(d=>{setProjects(d||SEED);setLoaded(true);});},[]);
  useEffect(()=>{if(loaded)saveProjects(projects);},[projects,loaded]);

  const updateProject=useCallback(u=>{setProjects(ps=>ps.map(p=>p.id===u.id?u:p));setSelected(s=>s?.id===u.id?u:s);},[]);
  const addProject=useCallback(p=>setProjects(ps=>[...ps,p]),[]);
  const ownerProjects=ownerFilter==="All"?projects:projects.filter(p=>p.owner===ownerFilter);
  const allE=ownerProjects.map(p=>({...p,_f:computeFlags(p),_r:launchRisk(p),_proj:calcProjectedDates(p)}));
  const counts={
    launchRisk:allE.filter(p=>p._r?.at||p._proj.slipDays>0).length,
    stuck:allE.filter(p=>p._f.risk.includes("Stuck in stage")).length,
    awaiting:allE.filter(p=>p.awaitingKA).length,
    noUpdate:allE.filter(p=>daysAgo(p.lastUpdated)>INACTIVITY_DAYS&&!["Paused","Killed","Launch"].includes(p.stage)).length,
    nearLaunch:allE.filter(p=>p.launchDate&&daysUntil(p.launchDate)>=0&&daysUntil(p.launchDate)<=45&&!["Paused","Killed","Launch"].includes(p.stage)).length,
  };
  const stageCounts=["Kickoff","North Star","Concept","Design","Tooling","KA Review","Pkg Approval","Production","Launch"].map(s=>({stage:s,count:ownerProjects.filter(p=>p.stage===s).length,color:STAGE_COLORS[s]}));
  const visible=useCallback(()=>{
    let arr=[...allE];
    if(filter==="launchRisk")arr=arr.filter(p=>p._r?.at||p._proj.slipDays>0);
    else if(filter==="stuck")arr=arr.filter(p=>p._f.risk.includes("Stuck in stage"));
    else if(filter==="awaiting")arr=arr.filter(p=>p.awaitingKA);
    else if(filter==="noUpdate")arr=arr.filter(p=>daysAgo(p.lastUpdated)>INACTIVITY_DAYS&&!["Paused","Killed","Launch"].includes(p.stage));
    else if(filter==="nearLaunch")arr=arr.filter(p=>p.launchDate&&daysUntil(p.launchDate)>=0&&daysUntil(p.launchDate)<=45&&!["Paused","Killed","Launch"].includes(p.stage));
    else arr=arr.filter(p=>!["Killed"].includes(p.stage));
    return arr.sort((a,b)=>priorityScore(b,b._f,b._r)-priorityScore(a,a._f,a._r));
  },[ownerProjects,filter]);

  if(!loaded)return<div style={{background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:T.muted,fontFamily:"Inter,sans-serif",fontSize:"13px"}}>Loading…</div>;

  return(
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"Inter,-apple-system,sans-serif",color:T.text}}>
      <div style={{background:T.card,borderBottom:`1px solid ${T.divider}`,padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontWeight:700,fontSize:"14px",color:T.text,letterSpacing:"-0.01em"}}>KitchenAid Development</span>
          <div style={{display:"flex",gap:"2px",background:"#F3F4F6",borderRadius:"7px",padding:"2px"}}>
            {["All",...OWNERS.map(o=>o.split(" ")[0])].map((label,i)=>{
              const fullName=i===0?"All":OWNERS[i-1];
              const active=ownerFilter===fullName;
              return<button key={label} onClick={()=>setOwnerFilter(fullName)} style={{background:active?T.card:"transparent",color:active?T.text:T.muted,border:active?`1px solid ${T.border}`:"1px solid transparent",borderRadius:"5px",padding:"4px 10px",cursor:"pointer",fontSize:"12px",fontWeight:active?700:400,fontFamily:"inherit",boxShadow:active?"0 1px 2px rgba(0,0,0,0.06)":"none"}}>{label}</button>;
            })}
          </div>
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <button onClick={()=>setShowSearch(true)} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.sub,borderRadius:"6px",padding:"5px 12px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit"}}>⌕ Search</button>
          <button onClick={()=>setShowDump(true)} style={{background:"#F0FDF4",border:"1px solid #BBF7D0",color:"#166534",borderRadius:"6px",padding:"5px 12px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:600}}>📋 Drop Notes</button>
          <button onClick={()=>setView("dashboard")} style={{background:view==="dashboard"?"#EFF6FF":"transparent",border:`1px solid ${view==="dashboard"?"#BFDBFE":T.border}`,color:view==="dashboard"?"#1D4ED8":T.sub,borderRadius:"6px",padding:"5px 12px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:view==="dashboard"?600:400}}>Dashboard</button>
          <button onClick={()=>setView("analytics")} style={{background:view==="analytics"?"#EFF6FF":"transparent",border:`1px solid ${view==="analytics"?"#BFDBFE":T.border}`,color:view==="analytics"?"#1D4ED8":T.sub,borderRadius:"6px",padding:"5px 12px",cursor:"pointer",fontSize:"12px",fontFamily:"inherit",fontWeight:view==="analytics"?600:400}}>Analytics</button>
          <button onClick={()=>setShowKickoff(true)} style={{background:"#2563EB",border:"none",color:"white",borderRadius:"6px",padding:"6px 14px",cursor:"pointer",fontSize:"12px",fontWeight:700,fontFamily:"inherit"}}>+ Kickoff</button>
        </div>
      </div>

      {view==="analytics"?<AnalyticsView projects={ownerProjects}/>:(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderBottom:`1px solid ${T.divider}`}}>
            {Object.entries(FILTER_STYLES).map(([key,fs],i,arr)=>{
              const active=filter===key,count=counts[key];
              return<button key={key} onClick={()=>setFilter(active?null:key)} style={{background:active?fs.bg:T.card,border:"none",borderRight:i<arr.length-1?`1px solid ${T.divider}`:"none",padding:"14px 18px",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                <div style={{fontSize:"13px",fontWeight:600,color:active?fs.text:T.sub,marginBottom:"3px"}}>{fs.label}</div>
                <div style={{fontSize:"26px",fontWeight:800,color:active?fs.text:count>0?T.text:T.muted,lineHeight:1}}>{count}</div>
              </button>;
            })}
          </div>
          <div style={{background:T.card,borderBottom:`1px solid ${T.border}`,display:"flex",overflowX:"auto"}}>
            {stageCounts.map((s,i,arr)=>(
              <div key={s.stage} style={{flex:1,padding:"7px 10px",borderRight:i<arr.length-1?`1px solid ${T.border}`:"none",minWidth:"64px",position:"relative"}}>
                <div style={{fontSize:"10px",color:s.count>0?T.sub:T.muted,fontWeight:500,marginBottom:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.stage}</div>
                <div style={{fontSize:"19px",fontWeight:700,color:s.count>0?s.color:T.muted,lineHeight:1}}>{s.count}</div>
                {s.count>0&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:"3px",background:s.color}}/>}
              </div>
            ))}
          </div>
          <div style={{padding:"12px 20px 28px"}}>
            <div style={{fontSize:"11px",color:T.muted,marginBottom:"10px",fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>{ownerFilter!=="All"&&<span style={{color:T.active,marginRight:"6px"}}>{ownerFilter.split(" ")[0]}'s board · </span>}{visible().length} initiative{visible().length!==1?"s":""}{filter&&` — ${FILTER_STYLES[filter]?.label}`}</span>
              {filter&&<button onClick={()=>setFilter(null)} style={{background:"transparent",border:`1px solid ${T.border}`,color:T.muted,borderRadius:"5px",padding:"3px 10px",cursor:"pointer",fontSize:"10px",fontFamily:"inherit"}}>Clear ×</button>}
            </div>
            {visible().map(p=><ProjectCard key={p.id} p={p} onClick={()=>setSelected(p)} onUpdate={updateProject}/>)}
            {!visible().length&&<div style={{textAlign:"center",padding:"48px",color:T.muted,fontSize:"13px"}}>No initiatives match this filter</div>}
          </div>
        </>
      )}

      {selected&&<DetailModal p={selected} onClose={()=>setSelected(null)} onUpdate={p=>{updateProject(p);setSelected(p);}}/>}
      {showKickoff&&<KickoffModal onSave={addProject} onClose={()=>setShowKickoff(false)}/>}
      {showSearch&&<SearchModal projects={projects} onClose={()=>setShowSearch(false)} onSelect={p=>setSelected(p)}/>}
      {showDump&&<GlobalDumpModal projects={projects} onClose={()=>setShowDump(false)} onUpdateAll={updated=>{setProjects(updated);setShowDump(false);}}/>}
    </div>
  );
}
