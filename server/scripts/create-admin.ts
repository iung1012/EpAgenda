import { createUser,createUserSchema } from '../src/auth.ts';
import { db } from '../src/db.ts';
// One-time bootstrap via SSH only; passwords are supplied through stdin, never argv.
if(await db.auth_users.count())throw new Error('Este comando funciona somente em um banco vazio. Use o administrador existente');
let input='';for await(const chunk of process.stdin)input+=String(chunk);
const user=createUserSchema.parse(JSON.parse(input));
await createUser({...user,role:'admin'});await db.$disconnect();
console.log('Administrador criado');
