/**
 * Ejemplos visuales esquemáticos. NO reproducen ningún documento oficial: son tarjetas genéricas con datos ficticios
 * para señalar «dónde suele estar» un dato. Los colores salen de los tokens (se ven bien en claro y en oscuro).
 */

export function IlustracionSoporte({ numero, soporte, nota }: { numero: string; soporte: string; nota: string }) {
  return (
    <figure className="ilustracion">
      <svg viewBox="0 0 340 200" role="img" aria-label={`${numero} · ${soporte}`}>
        <rect className="ilu-tarjeta" x="10" y="10" width="320" height="180" rx="14" />
        <rect className="ilu-linea" x="26" y="46" width="70" height="90" rx="6" />
        <rect className="ilu-linea" x="110" y="76" width="100" height="8" rx="4" />
        <rect className="ilu-linea" x="110" y="92" width="80" height="8" rx="4" />
        <rect className="ilu-linea" x="110" y="108" width="96" height="8" rx="4" />
        {/* Número de soporte (zona destacada) */}
        <text className="ilu-texto-suave" x="232" y="36">NÚM SOPORT</text>
        <text className="ilu-texto" x="232" y="52">ABC123456</text>
        <rect className="ilu-destacado" x="224" y="20" width="98" height="42" rx="6" />
        <text className="ilu-texto-suave" x="226" y="80">{soporte}</text>
        {/* Número del documento */}
        <text className="ilu-texto-suave" x="110" y="146">{numero}</text>
        <text className="ilu-texto" x="110" y="164">12345678Z</text>
      </svg>
      <figcaption>{nota}</figcaption>
    </figure>
  )
}
