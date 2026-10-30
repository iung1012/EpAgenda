import {existsSync,writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const destination='/opt/epagenda/shared/epagenda.env';
if(existsSync(destination)){console.log('Existing environment preserved');process.exit(0);}
mkdirSync('/opt/epagenda/shared',{recursive:true,mode:0o750});
const random=()=>randomBytes(32).toString('base64');
const environment={NODE_ENV:'production',HOST:'127.0.0.1',PORT:'3102',APP_ORIGIN:'https://epagenda.site',DATABASE_URL:'file:/opt/epagenda/shared/data/epagenda.db',DATA_DIR:'/opt/epagenda/shared/data',CREDENTIALS_KEY:random(),FILE_SIGNING_KEY:random(),CRON_SECRET:random(),DRIVE_STREAM_SECRET:random(),EVOLUTION_WEBHOOK_SECRET:random(),ENABLE_JOBS:'0',EVOLUTION_API_URL:'http://127.0.0.1:8080',EVOLUTION_API_KEY:'',GOOGLE_SERVICE_ACCOUNT_KEY:'',GOOGLE_DRIVE_ROOT_FOLDER_ID:'',OPENAI_API_KEY:''};
const existing=process.argv[2];
if(existing){const text=readFileSync(existing,'utf8');const found=text.match(/^AUTHENTICATION_API_KEY\s*=\s*(.+)$/m);if(found)environment.EVOLUTION_API_KEY=found[1].trim().replace(/^['"]|['"]$/g,'');}
writeFileSync(destination,Object.entries(environment).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{flag:'wx',mode:0o640});
console.log('Production environment created; secret values were not printed');
