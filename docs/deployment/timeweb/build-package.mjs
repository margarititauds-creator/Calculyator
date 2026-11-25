import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(root,'../Подключение_2026-11-15/site/.sites-checkout');
const expected='f844f27412fb3ba586698db5a23ab53ddf6efb1f';
const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();
if(revision!==expected||execFileSync('git',['status','--porcelain'],{cwd:source,encoding:'utf8'}).trim())throw Error('Source state changed; review before packaging');
const output=path.join(root,'public_html');
if(fs.existsSync(output))throw Error('Output exists; preserve it and review before rebuilding');
const gateway='https://d5dafk8hndmtgdf4nfio.3zvepvee.apigw.yandexcloud.net';
fs.cpSync(path.join(source,'web'),output,{recursive:true,errorOnExist:true,force:false});
fs.mkdirSync(path.join(output,'api'));
fs.writeFileSync(path.join(output,'api','config.json'),JSON.stringify({intakeOrigin:gateway,cloudDeliveryEnabled:false})+'\n',{flag:'wx'});
fs.writeFileSync(path.join(output,'.htaccess'),`Options -Indexes -MultiViews
DirectoryIndex index.html
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP_HOST} ^margarititavoronina\\.ru(?::[0-9]+)?$ [NC]
RewriteCond %{REQUEST_URI} !^/\\.well-known/acme-challenge/
RewriteRule ^ https://margarititavoronina.ru%{REQUEST_URI} [R=302,END,NE]
RewriteRule ^api/config$ api/config.json [END]
RewriteRule ^privacy\\.html$ ${gateway}/privacy [R=302,END,NE]
RewriteRule ^consent\\.html$ ${gateway}/consent [R=302,END,NE]
RewriteRule ^api/(?!config\\.json$) - [R=404,END]
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "no-referrer"
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ${gateway}; base-uri 'none'; form-action 'self'"
  <FilesMatch "\\.(html|js|css|json)$">
    Header always set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
AddType application/json .json
AddType text/javascript .js
`,{flag:'wx'});
const hashes={};
function visit(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())visit(file);else hashes[path.relative(output,file).replaceAll('\\','/')]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');}}
visit(output);
fs.writeFileSync(path.join(root,'package-manifest.json'),JSON.stringify({sourceCommit:revision,intakeOrigin:gateway,delivery:'existing hourly cloud schedule; no sender on Timeweb',files:hashes},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({files:Object.keys(hashes).length,sourceCommit:revision,output}));
