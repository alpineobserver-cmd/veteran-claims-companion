import { spawnSync } from "node:child_process";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const migrationName="20260721233000_lock_down_supabase_data_api";
const prisma=new PrismaClient();

let failedMigration;

try{
  const [migrationTable]=await prisma.$queryRaw`
    SELECT to_regclass('public."_prisma_migrations"') IS NOT NULL AS "exists"
  `;

  if(!migrationTable?.exists){
    console.log("[migration-recovery] No migration history exists; no recovery is needed.");
    process.exitCode=0;
  }else{
    const rows=await prisma.$queryRaw`
      SELECT "id"
      FROM "_prisma_migrations"
      WHERE "migration_name" = ${migrationName}
        AND "finished_at" IS NULL
        AND "rolled_back_at" IS NULL
      LIMIT 1
    `;
    failedMigration=rows[0];
  }
}finally{
  await prisma.$disconnect();
}

if(failedMigration){
  const prismaCli=path.join(process.cwd(),"node_modules","prisma","build","index.js");
  const result=spawnSync(process.execPath,[prismaCli,"migrate","resolve","--rolled-back",migrationName],{
    env:process.env,
    stdio:"inherit"
  });

  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`Prisma could not resolve the known failed migration (exit ${result.status ?? "unknown"}).`);

  console.log(`[migration-recovery] Resolved known failed migration ${migrationName}; normal deployment may continue.`);
}else{
  console.log("[migration-recovery] No matching unfinished migration was found.");
}
