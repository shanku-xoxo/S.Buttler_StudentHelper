import React from 'react';

export default function FormattedMessage({ text }) {
  if (!text) return null;

  // Clean up LaTeX math symbols to beautiful Unicode notation
  let cleanText = text
    .replace(/\\\(/g, '').replace(/\\\)/g, '')
    .replace(/\\\[/g, '').replace(/\\\]/g, '')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\frac\{1\}\{3\}/g, '⅓')
    .replace(/\\frac\{1\}\{2\}/g, '½')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)')
    .replace(/\\int_a\^b/g, '∫ₐᵇ')
    .replace(/\\int/g, '∫')
    .replace(/\\\,/g, ' ')
    .replace(/\\quad/g, '  ')
    .replace(/\\dx/g, 'dx')
    .replace(/\\frac\{d\}\{dx\}/g, 'd/dx')
    .replace(/\\cdot/g, '·')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\pi/g, 'π')
    .replace(/\\in/g, '∈')
    .replace(/\\rightarrow/g, '→')
    .replace(/r\^2/g, 'r²')
    .replace(/h\^2/g, 'h²')
    .replace(/r\^3/g, 'r³')
    .replace(/x\^n/g, 'xⁿ')
    .replace(/x\^\{n-1\}/g, 'xⁿ⁻¹')
    .replace(/C_2H_5OH/g, 'C₂H₅OH')
    .replace(/C_2H_6O/g, 'C₂H₆O')
    .replace(/H_2O/g, 'H₂O')
    .replace(/CO_2/g, 'CO₂')
    .replace(/CH_4/g, 'CH₄')
    .replace(/C_6H_\{12\}O_6/g, 'C₆H₁₂O₆')
    .replace(/\$/g, '');

  // Split lines and parse markdown structures
  const lines = cleanText.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        if (!trimmed) return <div key={idx} style={{ height: '4px' }} />;

        // Headings ###
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)', marginTop: '8px', marginBottom: '4px' }}>
              {parseBold(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }

        // Subheadings ####
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={idx} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '6px', marginBottom: '2px' }}>
              {parseBold(trimmed.replace(/^####\s+/, ''))}
            </h4>
          );
        }

        // Bullet lists
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', paddingLeft: '8px' }}>
              <span style={{ color: 'var(--accent)' }}>•</span>
              <span>{parseBold(trimmed.replace(/^[•\-\*]\s+/, ''))}</span>
            </div>
          );
        }

        // Numbered lists (1., 2., etc.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', paddingLeft: '4px' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)', minWidth: '16px' }}>{numMatch[1]}.</span>
              <span>{parseBold(numMatch[2])}</span>
            </div>
          );
        }

        // Standard Paragraph line
        return <div key={idx}>{parseBold(line)}</div>;
      })}
    </div>
  );
}

// Helper to parse **bold** and *italic* markdown tags into JSX <strong>/<em>
function parseBold(text) {
  if (!text) return null;
  
  // Split on **bold**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    
    // Split remaining part on *italic* or _italic_
    const subParts = part.split(/(\*.*?\*|_.*?_)/g);
    return subParts.map((sub, j) => {
      if ((sub.startsWith('*') && sub.endsWith('*')) || (sub.startsWith('_') && sub.endsWith('_'))) {
        return (
          <em key={`${i}-${j}`} style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            {sub.slice(1, -1)}
          </em>
        );
      }
      return sub;
    });
  });
}
