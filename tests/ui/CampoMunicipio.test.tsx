import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, type Mock } from 'vitest'
import { axeSinContraste as axe, TIMEOUT_AXE } from '../axe'
import { importar } from '../../scripts/ine/importar'
import { decodificarRelacion, ordenarRelaciones, type RelacionIne } from '../../src/ine/relacion'
import { ProveedorIne } from '../../src/ine/useIne'
import { FormularioViajero, viajeroVacio } from '../../src/ui/FormularioViajero'
import type { Viajero } from '../../src/domain/tipos'

/** Relaciones FICTICIAS (provincias 98 y 99). */
const rel = async (f: string) => decodificarRelacion(JSON.parse((await importar(new Uint8Array(readFileSync(join(__dirname, '..', 'fixtures', 'ine', f))), f, { ficticia: true })).json))
const RELACIONES = ordenarRelaciones([await rel('relacion-ficticia-2025.xlsx'), await rel('relacion-ficticia-2026.csv')])

function montar(over: Partial<Parameters<typeof FormularioViajero>[0]> = {}, relaciones: RelacionIne[] = RELACIONES) {
  const onGuardar = vi.fn() as Mock<(v: Viajero) => void>
  const props = { inicial: viajeroVacio('v1'), idioma: 'es' as const, modo: 'recepcion' as const, fechaEntrada: '2026-11-02', adultos: [], numero: 1, onGuardar, ...over }
  const utils = render(
    <ProveedorIne cargar={() => Promise.resolve(relaciones)}>
      <FormularioViajero {...props} />
    </ProveedorIne>,
  )
  return { ...utils, onGuardar }
}

describe('autocompletado municipio → código INE (recepción)', () => {
  it('el nombre del municipio es un combobox: al escribir, lista los municipios y anuncia cuántos hay', async () => {
    const user = userEvent.setup()
    montar()
    const campo = await screen.findByRole('combobox', { name: /Nombre del municipio/ })
    expect(campo).toHaveAttribute('aria-autocomplete', 'list')
    expect(campo).toHaveAttribute('aria-expanded', 'false')
    await user.type(campo, 'rozas')
    const lista = screen.getByRole('listbox', { name: /Nombre del municipio/ })
    expect(campo).toHaveAttribute('aria-expanded', 'true')
    expect(campo).toHaveAttribute('aria-controls', lista.id)
    expect(within(lista).getAllByRole('option').map((o) => o.textContent)).toEqual(['Rozas del Ensayo, Las — 99003'])
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('1 municipio encontrado')
  })

  it('con el teclado: flecha abajo marca la opción y Enter la elige, rellena el código y NO envía el formulario', async () => {
    const user = userEvent.setup()
    const { onGuardar } = montar()
    const campo = await screen.findByRole('combobox', { name: /Nombre del municipio/ })
    await user.type(campo, 'san inventado')
    await user.keyboard('{ArrowDown}')
    const op = screen.getByRole('option', { name: /San Inventado — 99901/ })
    expect(op).toHaveAttribute('aria-selected', 'true')
    expect(campo).toHaveAttribute('aria-activedescendant', op.id)
    await user.keyboard('{Enter}')
    expect(onGuardar).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(campo).toHaveValue('San Inventado')
    expect(campo).toHaveFocus()
    expect(screen.getByLabelText(/Código INE del municipio/)).toHaveValue('99901')
    expect(screen.getByText(/Código 99901: San Inventado \(relación del INE a 01\/01\/2026\)/)).toBeInTheDocument()
  })

  it('flechas arriba/abajo recorren la lista y Escape la cierra sin borrar lo escrito', async () => {
    const user = userEvent.setup()
    montar()
    const campo = await screen.findByRole('combobox', { name: /Nombre del municipio/ })
    await user.type(campo, 'villaficticia')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('option', { name: /99001/ })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('option', { name: /98001/ })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(campo).toHaveValue('villaficticia')
    expect(screen.getByLabelText(/Código INE del municipio/)).toHaveValue('')
  })

  it('con el ratón o el dedo: tocar una opción la elige', async () => {
    const user = userEvent.setup()
    montar()
    await user.type(await screen.findByRole('combobox', { name: /Nombre del municipio/ }), 'avila')
    await user.click(screen.getByRole('option', { name: /Ávila de Mentirijillas — 98002/ }))
    expect(screen.getByLabelText(/Código INE del municipio/)).toHaveValue('98002')
  })

  it('los municipios de la provincia del código postal salen primero', async () => {
    const user = userEvent.setup()
    montar()
    await user.type(screen.getByLabelText(/Código postal/), '99120')
    await user.type(await screen.findByRole('combobox', { name: /Nombre del municipio/ }), 'villaficticia')
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Villaficticia — 99001', 'Villaficticia — 98001'])
  })

  it('sin coincidencias lo dice, y el código se puede seguir escribiendo a mano', async () => {
    const user = userEvent.setup()
    montar()
    await user.type(await screen.findByRole('combobox', { name: /Nombre del municipio/ }), 'zzzz')
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Ningún municipio de la relación coincide')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('un código escrito a mano que no figura en la relación muestra un aviso (no un error)', async () => {
    const user = userEvent.setup()
    montar()
    await screen.findByRole('combobox', { name: /Nombre del municipio/ })
    const codigo = screen.getByLabelText(/Código INE del municipio/)
    await user.type(codigo, '99006')
    fireEvent.blur(codigo)
    expect(await screen.findByText(/figuraba en la relación del INE a 01\/01\/2025, pero ya no en la de 01\/01\/2026/)).toBeInTheDocument()
    expect(codigo).not.toHaveAttribute('aria-invalid')
  })

  it('con la muestra ficticia de la demo, lo avisa junto al campo', async () => {
    montar()
    expect(await screen.findByText(/relación de municipios FICTICIA/)).toBeInTheDocument()
  })

  it('sin relación del INE en esta versión: campo de texto normal y aviso de escribir el código a mano', async () => {
    montar({}, [])
    expect(await screen.findByText(/no incluye la relación de municipios del INE/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /municipio/ })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Nombre del municipio/ })).toBeInTheDocument()
  })

  it(
    'sin violaciones de axe con la lista abierta',
    async () => {
      const user = userEvent.setup()
      const { container } = montar()
      await user.type(await screen.findByRole('combobox', { name: /Nombre del municipio/ }), '99')
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      expect(await axe(container)).toHaveNoViolations()
    },
    TIMEOUT_AXE,
  )
})

describe('autocompletado en el formulario del huésped (opcional para él)', () => {
  it('en francés: el huésped puede elegir su municipio y el código se rellena, pero no está obligado', async () => {
    const user = userEvent.setup()
    montar({ modo: 'huesped', idioma: 'fr' })
    const campo = await screen.findByRole('combobox', { name: /Nom de la commune/ })
    await user.type(campo, 'mostra')
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(/1 commune trouvée/)
    await user.click(screen.getByRole('option', { name: /Muestra\/Mostra — 99004/ }))
    expect(screen.getByLabelText(/Code INE de la commune/)).toHaveValue('99004')
    expect(screen.getByLabelText(/Code INE de la commune/)).not.toBeRequired()
    expect(screen.queryByText(/no incluye la relación/)).not.toBeInTheDocument()
  })

  it('al cambiar de país el autocompletado desaparece (fuera de España se escribe el nombre)', async () => {
    const user = userEvent.setup()
    montar({ modo: 'huesped' })
    await screen.findByRole('combobox', { name: /Nombre del municipio/ })
    await user.selectOptions(screen.getByLabelText(/País de residencia/), 'FRA')
    await act(async () => undefined)
    expect(screen.queryByRole('combobox', { name: /municipio/i })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Municipio o ciudad/ })).toBeInTheDocument()
  })
})
