const fs = require('fs');

let appContent = fs.readFileSync('src/renderer/App.tsx', 'utf8');

const imports = "import { Onboarding } from './components/Onboarding';\nimport { AppLayout }";
appContent = appContent.replace("import { AppLayout }", imports);

const state = "const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboarded'));\n  const { addToast }";
appContent = appContent.replace("const { addToast }", state);

const render = `return (
    <>
      {showOnboarding && <Onboarding onComplete={() => { localStorage.setItem('onboarded', '1'); setShowOnboarding(false); }} />}
      <div id="sr-announcer"`;
appContent = appContent.replace(`return (
    <>
      <div id="sr-announcer"`, render);

fs.writeFileSync('src/renderer/App.tsx', appContent);
