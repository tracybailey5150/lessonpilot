'use client'

import { useState, useCallback } from 'react'

/**
 * Scientific Calculator — TI-30XS style
 * Supports: PEMDAS, fractions, decimals, percentages, square root, powers, log, parentheses
 * Used during CTS exam prep lessons and quizzes
 */
export default function Calculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [memory, setMemory] = useState(0)
  const [lastResult, setLastResult] = useState<number | null>(null)
  const [showingResult, setShowingResult] = useState(false)

  const handleInput = useCallback((value: string) => {
    if (showingResult) {
      if ('0123456789.('.includes(value)) {
        setExpression(value)
        setDisplay(value)
        setShowingResult(false)
        return
      } else if ('+-*/^'.includes(value)) {
        setExpression(display + value)
        setDisplay(display + value)
        setShowingResult(false)
        return
      }
    }

    if (value === 'C') {
      setDisplay('0')
      setExpression('')
      setShowingResult(false)
      return
    }

    if (value === 'CE') {
      const newExpr = expression.slice(0, -1) || '0'
      setExpression(newExpr)
      setDisplay(newExpr)
      return
    }

    if (value === '=') {
      try {
        // Replace display symbols with JS math
        let expr = expression
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/π/g, String(Math.PI))
          .replace(/√\(/g, 'Math.sqrt(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/(\d+)\^(\d+)/g, 'Math.pow($1,$2)')
          .replace(/\^/g, '**')

        // Safe eval
        const fn = new Function(`"use strict"; return (${expr})`)
        const result = fn()
        const rounded = Math.round(result * 1000000) / 1000000
        setDisplay(String(rounded))
        setExpression(String(rounded))
        setLastResult(rounded)
        setShowingResult(true)
      } catch {
        setDisplay('Error')
        setShowingResult(true)
      }
      return
    }

    if (value === '±') {
      if (expression.startsWith('-')) {
        setExpression(expression.slice(1))
        setDisplay(expression.slice(1))
      } else {
        setExpression('-' + expression)
        setDisplay('-' + expression)
      }
      return
    }

    if (value === '%') {
      try {
        const num = parseFloat(expression)
        const result = num / 100
        setDisplay(String(result))
        setExpression(String(result))
        setShowingResult(true)
      } catch {
        setDisplay('Error')
      }
      return
    }

    if (value === 'M+') { setMemory(memory + (lastResult ?? (parseFloat(display) || 0))); return }
    if (value === 'MR') { setExpression(expression + String(memory)); setDisplay(expression + String(memory)); return }
    if (value === 'MC') { setMemory(0); return }

    if (value === '√(') {
      setExpression(expression + '√(')
      setDisplay(expression + '√(')
      return
    }
    if (value === 'log(') {
      setExpression(expression + 'log(')
      setDisplay(expression + 'log(')
      return
    }
    if (value === 'ln(') {
      setExpression(expression + 'ln(')
      setDisplay(expression + 'ln(')
      return
    }
    if (value === 'x²') {
      setExpression(expression + '^2')
      setDisplay(expression + '^2')
      return
    }
    if (value === 'xʸ') {
      setExpression(expression + '^')
      setDisplay(expression + '^')
      return
    }
    if (value === 'π') {
      setExpression(expression + 'π')
      setDisplay(expression + 'π')
      return
    }
    if (value === '1/x') {
      try {
        const num = parseFloat(expression) || parseFloat(display)
        const result = 1 / num
        setDisplay(String(Math.round(result * 1000000) / 1000000))
        setExpression(String(result))
        setShowingResult(true)
      } catch { setDisplay('Error') }
      return
    }

    const newExpr = expression === '0' && !'.('.includes(value) ? value : expression + value
    setExpression(newExpr)
    setDisplay(newExpr)
  }, [expression, display, memory, lastResult, showingResult])

  const btn = (label: string, value?: string, color?: string, bg?: string, wide?: boolean) => (
    <button
      onClick={() => handleInput(value || label)}
      style={{
        background: bg || 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        color: color || '#E2E8F0',
        fontSize: '14px',
        fontWeight: 600,
        padding: '10px 0',
        cursor: 'pointer',
        gridColumn: wide ? 'span 2' : undefined,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = bg ? bg : 'rgba(255,255,255,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.background = bg || 'rgba(255,255,255,0.06)')}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      position: 'fixed', bottom: '80px', left: '16px', zIndex: 55,
      width: '320px', background: '#0C1220', border: '1px solid rgba(56,189,248,0.3)',
      borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🧮</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8' }}>AV Calculator</span>
          {memory !== 0 && <span style={{ fontSize: '10px', color: '#FBBF24', background: 'rgba(251,191,36,0.15)', padding: '2px 6px', borderRadius: '4px' }}>M</span>}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '16px', padding: '4px' }}>×</button>
      </div>

      {/* Display */}
      <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', margin: '8px', borderRadius: '8px', minHeight: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {expression !== display && expression && (
          <div style={{ fontSize: '11px', color: '#64748B', textAlign: 'right', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{expression}</div>
        )}
        <div style={{ fontSize: '22px', fontWeight: 700, color: '#F1F5F9', textAlign: 'right', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {display}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', padding: '8px 8px 12px' }}>
        {/* Row 1 — Scientific */}
        {btn('MC', 'MC', '#94A3B8')}
        {btn('MR', 'MR', '#94A3B8')}
        {btn('M+', 'M+', '#94A3B8')}
        {btn('√', '√(', '#A78BFA')}
        {btn('log', 'log(', '#A78BFA')}

        {/* Row 2 — Scientific */}
        {btn('x²', 'x²', '#A78BFA')}
        {btn('xʸ', 'xʸ', '#A78BFA')}
        {btn('π', 'π', '#A78BFA')}
        {btn('1/x', '1/x', '#A78BFA')}
        {btn('ln', 'ln(', '#A78BFA')}

        {/* Row 3 — Clear, parens, operations */}
        {btn('C', 'C', '#EF4444')}
        {btn('⌫', 'CE', '#F59E0B')}
        {btn('(', '(', '#64748B')}
        {btn(')', ')', '#64748B')}
        {btn('÷', '÷', '#38BDF8')}

        {/* Row 4 — Numbers */}
        {btn('7')}
        {btn('8')}
        {btn('9')}
        {btn('×', '×', '#38BDF8')}
        {btn('%', '%', '#38BDF8')}

        {/* Row 5 */}
        {btn('4')}
        {btn('5')}
        {btn('6')}
        {btn('−', '-', '#38BDF8')}
        {btn('±', '±', '#64748B')}

        {/* Row 6 */}
        {btn('1')}
        {btn('2')}
        {btn('3')}
        {btn('+', '+', '#38BDF8')}
        {btn('^', '^', '#A78BFA')}

        {/* Row 7 */}
        {btn('0', '0', undefined, undefined, true)}
        {btn('.')}
        {btn('=', '=', '#070C18', '#38BDF8', true)}
      </div>

      {/* Footer hint */}
      <div style={{ padding: '6px 12px 10px', textAlign: 'center', fontSize: '10px', color: '#475569' }}>
        TI-30XS style — matches CTS exam calculator
      </div>
    </div>
  )
}
