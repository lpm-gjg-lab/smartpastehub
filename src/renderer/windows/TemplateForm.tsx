import React, { useState } from 'react';
import { useTemplates } from '../hooks/template/useTemplates';
import { useTemplateFields } from '../hooks/template/useTemplateFields';
import { useTemplatePreview } from '../hooks/template/useTemplatePreview';
import { FloatingWindowShell } from '../components/FloatingWindowShell';
import { TemplateSelector } from '../components/template-form/TemplateSelector';
import { TemplateEditor } from '../components/template-form/TemplateEditor';
import { FieldInputs } from '../components/template-form/FieldInputs';
import { TemplatePreview } from '../components/template-form/TemplatePreview';
import { TemplateActionBar } from '../components/template-form/TemplateActionBar';

export default function TemplateForm() {
  const [selectedId, setSelectedId] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [newName, setNewName] = useState('');

  const { templates, saveTemplate } = useTemplates();
  const { fields, userValues, setUserValues } = useTemplateFields(rawContent);
  const { preview } = useTemplatePreview(rawContent, userValues);

  const handleSelectTemplate = (id: string) => {
    setSelectedId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setRawContent(tmpl.content);
      setNewName(tmpl.name);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(preview);
  };

  const handleSave = async () => {
    await saveTemplate(selectedId, newName, rawContent);
  };

  return (
    <FloatingWindowShell title="Template Form" icon="📝" height={520}>
      <TemplateSelector
        templates={templates}
        selectedId={selectedId}
        onSelect={handleSelectTemplate}
        newName={newName}
        setNewName={setNewName}
      />

      <TemplateEditor rawContent={rawContent} setRawContent={setRawContent} />

      <FieldInputs
        fields={fields}
        userValues={userValues}
        setUserValues={setUserValues}
      />

      <TemplatePreview preview={preview} />

      <TemplateActionBar
        onCopy={handleCopy}
        onSave={handleSave}
        disableSave={!newName || !rawContent}
      />
    </FloatingWindowShell>
  );
}
