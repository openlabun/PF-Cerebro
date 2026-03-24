import { useEffect, useId, useRef, useState } from 'react'

function normalizeIndex(index, length) {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

function DifficultySelect({ id, value, options, onChange, disabled = false }) {
  const generatedId = useId()
  const triggerId = id || `difficulty-select-${generatedId}`
  const listboxId = `${generatedId}-listbox`
  const shellRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const [open, setOpen] = useState(false)

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const selectedOption = options[selectedIndex] || options[0] || { label: '', value: '' }

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event) {
      if (!shellRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open || disabled) return undefined

    const frameId = window.requestAnimationFrame(() => {
      optionRefs.current[selectedIndex]?.focus()
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [disabled, open, selectedIndex])

  useEffect(() => {
    if (disabled) {
      setOpen(false)
    }
  }, [disabled])

  function focusOption(index) {
    const nextIndex = normalizeIndex(index, options.length)
    optionRefs.current[nextIndex]?.focus()
  }

  function closeMenu(restoreFocus = true) {
    setOpen(false)
    if (!restoreFocus) return
    window.requestAnimationFrame(() => {
      triggerRef.current?.focus()
    })
  }

  function handleSelect(nextValue) {
    if (nextValue !== value) {
      onChange(nextValue)
    }
    closeMenu()
  }

  function handleTriggerKeyDown(event) {
    if (disabled || options.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      focusOption(selectedIndex + 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      focusOption(selectedIndex - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((current) => !current)
    }
  }

  function handleOptionKeyDown(event, index) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusOption(index + 1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusOption(index - 1)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusOption(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      focusOption(options.length - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelect(options[index].value)
      return
    }

    if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={shellRef}
      className={`difficulty-select-shell${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className="difficulty-select"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        onClick={() => {
          if (disabled || options.length === 0) return
          setOpen((current) => !current)
        }}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
      >
        <span className="difficulty-select-value">{selectedOption.label}</span>
      </button>

      {open ? (
        <div id={listboxId} className="difficulty-select-menu" role="listbox" aria-labelledby={triggerId}>
          {options.map((option, index) => {
            const isSelected = option.value === value

            return (
              <div
                key={option.value}
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                role="option"
                tabIndex={0}
                aria-selected={isSelected}
                className={`difficulty-select-option${isSelected ? ' is-selected' : ''}`}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
              >
                {option.label}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default DifficultySelect
