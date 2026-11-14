import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const target='samsung-local-dist';
fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
fs.cpSync('dist',target,{recursive:true});
let html=fs.readFileSync(path.join(target,'index.html'),'utf8');
html=html.replace(/<head>/,'<head><script src="./poster-cache.js"></script><script src="./licensed-cache.js"></script><script src="./tizen-shell.js"></script>').replace(/href="\/(cinema\.css|tv-layout\.css)"/g,'href="./$1"').replace(/src="\/tv-navigation\.js"/g,'src="./tv-navigation.js"').replace(/<script>\s*if \('serviceWorker'[\s\S]*?<\/script>/,'<script>window.open=function(){return null;};</script>');
fs.writeFileSync(path.join(target,'index.html'),html);
fs.writeFileSync(path.join(target,'config.xml'),`<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets" xmlns:tizen="http://tizen.org/ns/widgets" id="https://cinema.tv/app" version="1.3.1" viewmodes="maximized">
<tizen:application id="CineTV2026.CinemaTV" package="CineTV2026" required_version="6.0"/>
<content src="index.html"/><name>Cinema TV</name><icon src="icon.png"/>
<tizen:profile name="tv-samsung"/><tizen:privilege name="http://tizen.org/privilege/internet"/><tizen:privilege name="http://tizen.org/privilege/tv.inputdevice"/>
<access origin="https://movie.o-a-f-a.workers.dev" subdomains="false"/><access origin="*" subdomains="true"/>
<tizen:setting screen-orientation="landscape" context-menu="disable" background-support="disable" encryption="disable" install-location="auto" hwkey-event="enable"/>
</widget>`);
const icon=process.env.CINEMA_ICON_B64;
if(!icon)throw Error('Icon missing');fs.writeFileSync(path.join(target,'icon.png'),Buffer.from(icon,'base64'));
fs.rmSync(path.join(target,'sw.js'),{force:true});
fs.writeFileSync(path.join(target,'licensed-cache.js'),'window.__TV_LICENSED__='+fs.readFileSync(path.join(target,'licensed-arabic.json'),'utf8')+';');
for(const name of ['index.html','cinema.css','tv-layout.css','tizen-shell.js','tv-navigation.js','config.xml','icon.png'])if(!fs.statSync(path.join(target,name)).size)throw Error('Empty '+name);
if(/cdn\.tailwindcss\.com|<iframe id="cinema"/.test(html))throw Error('Runtime compiler or wrapper found');
console.log('Local TV package verified:',fs.readdirSync(target).join(', '));
