/**
 * ISO 3166-1 (alfa-3 ↔ alfa-2). El documento oficial exige alfa-3 pero NO incluye la tabla:
 * esta lista procede de la norma ISO 3166-1 (249 códigos oficialmente asignados).
 * PENDIENTE-OFICIAL (P4): confirmar con el portal si admite códigos adicionales (p. ej. XKX para Kosovo).
 * Los nombres se obtienen del navegador con Intl.DisplayNames (sin tablas de traducción propias).
 */

const LISTA =
  'AFG:AF ALA:AX ALB:AL DZA:DZ ASM:AS AND:AD AGO:AO AIA:AI ATA:AQ ATG:AG ARG:AR ARM:AM ABW:AW AUS:AU AUT:AT AZE:AZ ' +
  'BHS:BS BHR:BH BGD:BD BRB:BB BLR:BY BEL:BE BLZ:BZ BEN:BJ BMU:BM BTN:BT BOL:BO BES:BQ BIH:BA BWA:BW BVT:BV BRA:BR ' +
  'IOT:IO BRN:BN BGR:BG BFA:BF BDI:BI CPV:CV KHM:KH CMR:CM CAN:CA CYM:KY CAF:CF TCD:TD CHL:CL CHN:CN CXR:CX CCK:CC ' +
  'COL:CO COM:KM COG:CG COD:CD COK:CK CRI:CR CIV:CI HRV:HR CUB:CU CUW:CW CYP:CY CZE:CZ DNK:DK DJI:DJ DMA:DM DOM:DO ' +
  'ECU:EC EGY:EG SLV:SV GNQ:GQ ERI:ER EST:EE SWZ:SZ ETH:ET FLK:FK FRO:FO FJI:FJ FIN:FI FRA:FR GUF:GF PYF:PF ATF:TF ' +
  'GAB:GA GMB:GM GEO:GE DEU:DE GHA:GH GIB:GI GRC:GR GRL:GL GRD:GD GLP:GP GUM:GU GTM:GT GGY:GG GIN:GN GNB:GW GUY:GY ' +
  'HTI:HT HMD:HM VAT:VA HND:HN HKG:HK HUN:HU ISL:IS IND:IN IDN:ID IRN:IR IRQ:IQ IRL:IE IMN:IM ISR:IL ITA:IT JAM:JM ' +
  'JPN:JP JEY:JE JOR:JO KAZ:KZ KEN:KE KIR:KI PRK:KP KOR:KR KWT:KW KGZ:KG LAO:LA LVA:LV LBN:LB LSO:LS LBR:LR LBY:LY ' +
  'LIE:LI LTU:LT LUX:LU MAC:MO MDG:MG MWI:MW MYS:MY MDV:MV MLI:ML MLT:MT MHL:MH MTQ:MQ MRT:MR MUS:MU MYT:YT MEX:MX ' +
  'FSM:FM MDA:MD MCO:MC MNG:MN MNE:ME MSR:MS MAR:MA MOZ:MZ MMR:MM NAM:NA NRU:NR NPL:NP NLD:NL NCL:NC NZL:NZ NIC:NI ' +
  'NER:NE NGA:NG NIU:NU NFK:NF MKD:MK MNP:MP NOR:NO OMN:OM PAK:PK PLW:PW PSE:PS PAN:PA PNG:PG PRY:PY PER:PE PHL:PH ' +
  'PCN:PN POL:PL PRT:PT PRI:PR QAT:QA REU:RE ROU:RO RUS:RU RWA:RW BLM:BL SHN:SH KNA:KN LCA:LC MAF:MF SPM:PM VCT:VC ' +
  'WSM:WS SMR:SM STP:ST SAU:SA SEN:SN SRB:RS SYC:SC SLE:SL SGP:SG SXM:SX SVK:SK SVN:SI SLB:SB SOM:SO ZAF:ZA SGS:GS ' +
  'SSD:SS ESP:ES LKA:LK SDN:SD SUR:SR SJM:SJ SWE:SE CHE:CH SYR:SY TWN:TW TJK:TJ TZA:TZ THA:TH TLS:TL TGO:TG TKL:TK ' +
  'TON:TO TTO:TT TUN:TN TUR:TR TKM:TM TCA:TC TUV:TV UGA:UG UKR:UA ARE:AE GBR:GB USA:US UMI:UM URY:UY UZB:UZ VUT:VU ' +
  'VEN:VE VNM:VN VGB:VG VIR:VI WLF:WF ESH:EH YEM:YE ZMB:ZM ZWE:ZW'

export interface Pais {
  alfa3: string
  alfa2: string
}

export const PAISES: readonly Pais[] = LISTA.split(' ').map((par) => {
  const [alfa3, alfa2] = par.split(':') as [string, string]
  return { alfa3, alfa2 }
})

const SET_ALFA3 = new Set(PAISES.map((p) => p.alfa3))

export const alfa3Espana = 'ESP'

export function esPaisAlfa3(valor: unknown): boolean {
  return typeof valor === 'string' && SET_ALFA3.has(valor)
}

/** Nombre del país en el idioma pedido (Intl.DisplayNames); si el navegador no lo conoce, el propio código. */
export function nombrePais(alfa3: string, idioma: 'es' | 'en'): string {
  const p = PAISES.find((x) => x.alfa3 === alfa3)
  if (!p) return alfa3
  try {
    return new Intl.DisplayNames([idioma], { type: 'region' }).of(p.alfa2) ?? alfa3
  } catch {
    return alfa3
  }
}

/** Países ordenados por nombre en el idioma dado (para los desplegables). */
export function paisesOrdenados(idioma: 'es' | 'en'): { alfa3: string; nombre: string }[] {
  return PAISES.map((p) => ({ alfa3: p.alfa3, nombre: nombrePais(p.alfa3, idioma) })).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, idioma),
  )
}
