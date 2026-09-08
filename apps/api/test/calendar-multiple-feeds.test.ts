import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CalendarIcsFeedService } from "../src/calendar/calendar-ics-feed.service";

const date=new Date("2026-09-08T12:00:00Z");
const tokenA="A".repeat(43),tokenB="B".repeat(43),tokenC="C".repeat(43);
const base={familyId:"family-1",enabled:true,includeReminders:false,includeSchoolWeekReminders:false,scope:"family",selectedFamilyMemberId:null,createdByFamilyMemberId:"member-1",createdAt:date,updatedAt:date,selectedMembers:[]};
const feeds:any[]=[
 {id:"all",name:"Familiekalender",token:tokenA,includeEvents:true,includeMeals:true,...base},
 {id:"meals",name:"Middager",token:tokenB,includeEvents:false,includeMeals:true,...base},
 {id:"selected",name:"Barna",token:tokenC,includeEvents:true,includeMeals:true,...base,scope:"selectedParticipant",selectedMembers:[{familyMemberId:"member-1"},{familyMemberId:"member-2"}]}
];
const events=[{id:"event-1",title:"Fotball",description:null,location:null,startsAt:date,endsAt:null,allDay:false,updatedAt:date,memberIds:["member-1"],participants:[]},{id:"event-2",title:"Voksentime",description:null,location:null,startsAt:date,endsAt:null,allDay:false,updatedAt:date,memberIds:["member-3"],participants:[]}];
const meals=[{id:"meal-1",mealName:"Taco",notes:null,date,updatedAt:date}];
const db:any={
 calendarExportFeed:{findUnique:async({where}:any)=>feeds.find(f=>f.token===where.token)||null},
 calendarEvent:{findMany:async({where}:any)=>{const ids=where.participants?.some?.familyMemberId?.in;return ids?events.filter(e=>e.memberIds.some((id:string)=>ids.includes(id))):events}},
 mealPlanDay:{findMany:async()=>meals}, reminder:{findMany:async()=>[]},schoolWeekReminder:{findMany:async()=>[]}
};
const service=new CalendarIcsFeedService({client:db} as any,{} as any);
async function run(){
 const all=await service.renderFeed(`${tokenA}.ics`), mealOnly=await service.renderFeed(`${tokenB}.ics`), selected=await service.renderFeed(`${tokenC}.ics`);
 assert.match(all,/SUMMARY:Fotball/); assert.match(all,/SUMMARY:Middag: Taco/);
 assert.match(mealOnly,/BEGIN:VCALENDAR/); assert.match(mealOnly,/SUMMARY:Middag: Taco/); assert.doesNotMatch(mealOnly,/SUMMARY:Fotball/);
 assert.match(selected,/SUMMARY:Fotball/); assert.doesNotMatch(selected,/SUMMARY:Voksentime/); assert.match(selected,/SUMMARY:Middag: Taco/,"family-wide meals survive member filters");
 feeds[1].enabled=false; await assert.rejects(()=>service.renderFeed(tokenB),/not found/i); assert.match(await service.renderFeed(tokenA),/SUMMARY:Fotball/);
 const sql=readFileSync("prisma/migrations/20260908120000_multiple_calendar_export_feeds/migration.sql","utf8");
 assert.match(sql,/DROP INDEX "calendar_export_feeds_familyId_key"/); assert.match(sql,/INSERT INTO "calendar_export_feed_members"/); assert.doesNotMatch(sql,/UPDATE "calendar_export_feeds" SET "token"/i,"migration must preserve existing tokens");
 console.log("multiple calendar feeds: ok");
}
void run();
