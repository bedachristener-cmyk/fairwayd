import { useState } from 'react';
import { countryName, guideCopy, useEntryGuides } from './api';
export function EntryCountryPicker({value,onChange,disabled=false}:{value:string[];onChange:(codes:string[])=>void;disabled?:boolean}) {
 const {guides,loading,error,reload}=useEntryGuides();const c=guideCopy();const [enabled,setEnabled]=useState(value.length>0);
 const codes=[...new Set([...guides.map(guide=>guide.countryCode),...value])];
 return <fieldset disabled={disabled} style={{margin:0,minWidth:0,border:'1px solid var(--border)',borderRadius:14,padding:12,display:'grid',gap:10}}>
  <legend style={{padding:'0 6px',fontWeight:800,fontSize:14}}>{c.title}</legend>
  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:14,fontWeight:700}}><input type="checkbox" checked={enabled} onChange={event=>{setEnabled(event.target.checked);if(!event.target.checked)onChange([]);}}/>{c.choose}</label>
  {enabled?<><p style={{margin:0,fontSize:12,color:'var(--sub)',lineHeight:1.5}}>{c.help}</p>
   {loading?<span role="status">{c.loading}</span>:null}{error?<span role="alert">{error} <button type="button" onClick={reload}>{c.retry}</button></span>:null}
   {codes.map(code=><label key={code} style={{display:'flex',gap:8,alignItems:'center',fontSize:14}}><input type="checkbox" checked={value.includes(code)} onChange={event=>onChange(event.target.checked?[...value,code]:value.filter(item=>item!==code))}/>{countryName(code)}{!guides.some(g=>g.countryCode===code)?` · ${c.unavailable}`:''}</label>)}
  </>:null}
 </fieldset>;
}
