import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import ts from 'typescript';
registerHooks({
 resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
   const path=resolvePath('src',specifier.slice(2));
   const target=[path,path+'.ts',path+'.tsx',path+'/index.ts'].find(p=>existsSync(p));
   if(target)return {url:pathToFileURL(target).href,shortCircuit:true};
  }
  return nextResolve(specifier,context);
 },
 load(url, context, nextLoad) {
  if(url.endsWith('.ts')||url.endsWith('.tsx'))return {format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,shortCircuit:true};
  return nextLoad(url,context);
 }
});
