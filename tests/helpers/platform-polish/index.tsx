export default function FixtureIndex() {
  const families = {
    inicio:['mixed','teach','study','none','teach-empty','study-empty','archived','error','loading'],
    agenda:['populated','empty','reference','all-day','error','loading','conflict'],
    'mis-aulas':['populated','empty','error','loading'],
    classroom:['teacher','student','archived','empty','error','loading'],
    grading:['populated','error'],
    wizard:['populated'],
    'sign-in':['populated','error'],register:['populated'],
    'verify-email':['populated','token'],'forgot-password':['populated'],'recover-password':['populated','token'],
    profile:['populated','error'],settings:['populated'],files:['populated'],
  };
  return <main style={{padding:32,maxWidth:1000,margin:'auto'}}><h1>FoxMind · QA sintética</h1>
    <p>fixture=true · Componentes reales · Datos en memoria · Sin autenticación ni persistencia.</p>
    {Object.entries(families).map(([family,modes])=><section key={family}><h2>{family}</h2><p style={{display:'flex',gap:16,flexWrap:'wrap'}}>
      {modes.map(mode=><a key={mode} href={`/${family}?mode=${mode}&fixture=true`}>{mode}</a>)}
    </p></section>)}
    <p><a href="/files?kind=classroom&id=11111111-1111-4111-8111-111111111111&purpose=material">Archivos con contexto de aula sintética</a></p>
    <section><h2>Autoría, entrega y resultados</h2><p style={{display:'flex',gap:16,flexWrap:'wrap'}}>
      {['assignment','questionnaire','evaluation','submitted','readonly'].map(mode=><a key={mode} href={`/learning?kind=attempt&mode=${mode}&fixture=true`}>Intento {mode}</a>)}
      {['assignment','questionnaire'].map(mode=><a key={mode} href={`/learning?kind=authoring&mode=${mode}&fixture=true`}>Autoría {mode}</a>)}
      <a href="/learning?kind=generation&fixture=true">Generación IA · formulario sin proveedor</a>
      <a href="/learning?kind=result&fixture=true">Resultado publicado</a>
      <a href="/learning?kind=result&mode=pending&fixture=true">Resultado pendiente</a>
    </p></section>
  </main>;
}
