'use strict';

// =============================================================
//  TARIFA DE PRIMAS AT y EP — Disp. Adic. 4ª Ley 42/2006
//  Redacción dada por Disp. Final 5ª RDL 28/2018 (BOE-A-2018-17992)
//  Vigente desde 01/01/2019
//
//  Cuadro I: Tipos por actividad económica (CNAE-2009)
//  Columnas: { it: tipo IT%, ims: tipo IMS% }
//  Total AT = it + ims
// =============================================================

const TARIFA_AT = {
    // 01 Agricultura, ganadería, caza (excepto 0113,0119,0129,0130,014,0147,015,016,0164,017)
    '01':   { it: 1.50, ims: 1.10, d: 'Agricultura, ganadería, caza y servicios relacionados' },
    '0113': { it: 1.00, ims: 1.00, d: 'Cultivo de hortalizas, raíces y tubérculos' },
    '0119': { it: 1.00, ims: 1.00, d: 'Otros cultivos no perennes' },
    '0129': { it: 2.25, ims: 2.90, d: 'Otros cultivos perennes' },
    '0130': { it: 1.15, ims: 1.10, d: 'Propagación de plantas' },
    '014':  { it: 1.80, ims: 1.50, d: 'Producción ganadera (excepto 0147)' },
    '0147': { it: 1.25, ims: 1.15, d: 'Avicultura' },
    '015':  { it: 1.60, ims: 1.20, d: 'Producción agrícola combinada con la producción ganadera' },
    '016':  { it: 1.60, ims: 1.20, d: 'Actividades de apoyo a la agricultura y ganadería (excepto 0164)' },
    '0164': { it: 1.15, ims: 1.10, d: 'Tratamiento de semillas para reproducción' },
    '017':  { it: 1.80, ims: 1.50, d: 'Caza, captura de animales y servicios relacionados' },

    // 02 Silvicultura y explotación forestal
    '02': { it: 2.25, ims: 2.90, d: 'Silvicultura y explotación forestal' },

    // 03 Pesca y acuicultura (excepto 0322)
    '03':   { it: 3.05, ims: 3.35, d: 'Pesca y acuicultura' },
    '0322': { it: 3.05, ims: 3.20, d: 'Acuicultura en agua dulce' },

    // 05 Extracción de antracita, hulla y lignito
    '05': { it: 2.30, ims: 2.90, d: 'Extracción de antracita, hulla y lignito' },

    // 06 Extracción de crudo de petróleo y gas natural
    '06': { it: 2.30, ims: 2.90, d: 'Extracción de crudo de petróleo y gas natural' },

    // 07 Extracción de minerales metálicos
    '07': { it: 2.30, ims: 2.90, d: 'Extracción de minerales metálicos' },

    // 08 Otras industrias extractivas
    '08': { it: 2.30, ims: 2.90, d: 'Otras industrias extractivas' },

    // 09 Actividades de apoyo a las industrias extractivas
    '09': { it: 2.30, ims: 2.90, d: 'Actividades de apoyo a las industrias extractivas' },

    // 10 Industria de la alimentación (excepto 101,102,106,107,108)
    '10':  { it: 1.60, ims: 1.60, d: 'Industria de la alimentación' },
    '101': { it: 2.00, ims: 1.90, d: 'Procesado y conservación de carne y productos cárnicos' },
    '102': { it: 1.80, ims: 1.50, d: 'Procesado y conservación de pescados, crustáceos y moluscos' },
    '106': { it: 1.70, ims: 1.60, d: 'Fabricación de productos de molinería, almidones y amiláceos' },
    '107': { it: 1.05, ims: 0.90, d: 'Fabricación de productos de panadería y pastas alimenticias' },
    '108': { it: 1.05, ims: 0.90, d: 'Fabricación de otros productos alimenticios' },

    // 11 Fabricación de bebidas
    '11': { it: 1.60, ims: 1.60, d: 'Fabricación de bebidas' },

    // 12 Industria del tabaco
    '12': { it: 1.00, ims: 0.80, d: 'Industria del tabaco' },

    // 13 Industria textil (excepto 1391)
    '13':   { it: 1.00, ims: 0.85, d: 'Industria textil' },
    '1391': { it: 0.80, ims: 0.70, d: 'Fabricación de tejidos de punto' },

    // 14 Confección de prendas de vestir (excepto 1411,1420,143)
    '14':   { it: 0.80, ims: 0.70, d: 'Confección de prendas de vestir' },
    '1411': { it: 1.50, ims: 1.10, d: 'Confección de prendas de vestir de cuero' },
    '1420': { it: 1.50, ims: 1.10, d: 'Fabricación de artículos de peletería' },
    '143':  { it: 0.80, ims: 0.70, d: 'Confección de prendas de vestir de punto' },

    // 15 Industria del cuero y del calzado
    '15': { it: 1.50, ims: 1.10, d: 'Industria del cuero y del calzado' },

    // 16 Industria de la madera (excepto 1624,1629)
    '16':   { it: 2.25, ims: 2.90, d: 'Industria de la madera y del corcho' },
    '1624': { it: 2.10, ims: 2.00, d: 'Fabricación de envases y embalajes de madera' },
    '1629': { it: 2.10, ims: 2.00, d: 'Fabricación de otros productos de madera' },

    // 17 Industria del papel (excepto 171)
    '17':  { it: 1.00, ims: 1.05, d: 'Industria del papel' },
    '171': { it: 2.00, ims: 1.50, d: 'Fabricación de pasta papelera, papel y cartón' },

    // 18 Artes gráficas
    '18': { it: 1.00, ims: 1.00, d: 'Artes gráficas y reproducción de soportes grabados' },

    // 19 Coquerías y refino de petróleo
    '19': { it: 1.45, ims: 1.90, d: 'Coquerías y refino de petróleo' },

    // 20 Industria química (excepto 204,206)
    '20':  { it: 1.60, ims: 1.40, d: 'Industria química' },
    '204': { it: 1.50, ims: 1.20, d: 'Fabricación de jabones, detergentes, perfumes y cosméticos' },
    '206': { it: 1.50, ims: 1.20, d: 'Fabricación de fibras artificiales y sintéticas' },

    // 21 Fabricación de productos farmacéuticos
    '21': { it: 1.30, ims: 1.10, d: 'Fabricación de productos farmacéuticos' },

    // 22 Fabricación de productos de caucho y plástico
    '22': { it: 1.75, ims: 1.25, d: 'Fabricación de productos de caucho y plástico' },

    // 23 Fabricación de otros productos minerales no metálicos (excepto 231,232,2331,234,237)
    '23':   { it: 2.10, ims: 2.00, d: 'Fabricación de otros productos minerales no metálicos' },
    '231':  { it: 1.60, ims: 1.50, d: 'Fabricación de vidrio y productos de vidrio' },
    '232':  { it: 1.60, ims: 1.50, d: 'Fabricación de productos cerámicos refractarios' },
    '2331': { it: 1.60, ims: 1.50, d: 'Fabricación de azulejos y baldosas de cerámica' },
    '234':  { it: 1.60, ims: 1.50, d: 'Fabricación de otros productos cerámicos' },
    '237':  { it: 2.75, ims: 3.35, d: 'Corte, tallado y acabado de la piedra' },

    // 24 Metalurgia
    '24': { it: 2.00, ims: 1.85, d: 'Metalurgia; fabricación de productos de hierro, acero y ferroaleaciones' },

    // 25 Fabricación de productos metálicos
    '25': { it: 2.00, ims: 1.85, d: 'Fabricación de productos metálicos, excepto maquinaria y equipo' },

    // 26 Fabricación de productos informáticos, electrónicos y ópticos
    '26': { it: 1.50, ims: 1.10, d: 'Fabricación de productos informáticos, electrónicos y ópticos' },

    // 27 Fabricación de material y equipo eléctrico
    '27': { it: 1.60, ims: 1.20, d: 'Fabricación de material y equipo eléctrico' },

    // 28 Fabricación de maquinaria y equipo n.c.o.p.
    '28': { it: 2.00, ims: 1.85, d: 'Fabricación de maquinaria y equipo n.c.o.p.' },

    // 29 Fabricación de vehículos de motor, remolques y semirremolques
    '29': { it: 1.60, ims: 1.20, d: 'Fabricación de vehículos de motor, remolques y semirremolques' },

    // 30 Fabricación de otro material de transporte (excepto 3091,3092)
    '30':   { it: 2.00, ims: 1.85, d: 'Fabricación de otro material de transporte' },
    '3091': { it: 1.60, ims: 1.20, d: 'Fabricación de motocicletas' },
    '3092': { it: 1.60, ims: 1.20, d: 'Fabricación de bicicletas y vehículos para personas con discapacidad' },

    // 31 Fabricación de muebles
    '31': { it: 2.00, ims: 1.85, d: 'Fabricación de muebles' },

    // 32 Otra industria manufacturera (excepto 321,322)
    '32':  { it: 1.60, ims: 1.20, d: 'Otra industria manufacturera' },
    '321': { it: 1.00, ims: 0.85, d: 'Fabricación de artículos de joyería y artículos similares' },
    '322': { it: 1.00, ims: 0.85, d: 'Fabricación de instrumentos musicales' },

    // 33 Reparación e instalación de maquinaria (excepto 3313,3314)
    '33':   { it: 2.00, ims: 1.85, d: 'Reparación e instalación de maquinaria y equipo' },
    '3313': { it: 1.50, ims: 1.10, d: 'Reparación de equipos electrónicos y ópticos' },
    '3314': { it: 1.60, ims: 1.20, d: 'Reparación de equipos eléctricos' },

    // 35 Suministro de energía eléctrica, gas, vapor y aire acondicionado
    '35': { it: 1.80, ims: 1.50, d: 'Suministro de energía eléctrica, gas, vapor y aire acondicionado' },

    // 36 Captación, depuración y distribución de agua
    '36': { it: 2.10, ims: 1.60, d: 'Captación, depuración y distribución de agua' },

    // 37 Recogida y tratamiento de aguas residuales
    '37': { it: 2.10, ims: 1.60, d: 'Recogida y tratamiento de aguas residuales' },

    // 38 Recogida, tratamiento y eliminación de residuos; valorización
    '38': { it: 2.10, ims: 1.60, d: 'Recogida, tratamiento y eliminación de residuos; valorización' },

    // 39 Actividades de descontaminación y otros servicios de gestión de residuos
    '39': { it: 2.10, ims: 1.60, d: 'Actividades de descontaminación y otros servicios de gestión de residuos' },

    // 41 Construcción de edificios (excepto 411)
    '41':  { it: 3.35, ims: 3.35, d: 'Construcción de edificios' },
    '411': { it: 0.85, ims: 0.80, d: 'Promoción inmobiliaria' },

    // 42 Ingeniería civil
    '42': { it: 3.35, ims: 3.35, d: 'Ingeniería civil' },

    // 43 Actividades de construcción especializada
    '43': { it: 3.35, ims: 3.35, d: 'Actividades de construcción especializada' },

    // 45 Venta y reparación de vehículos de motor (excepto 452,454)
    '45':  { it: 1.00, ims: 1.05, d: 'Venta y reparación de vehículos de motor y motocicletas' },
    '452': { it: 2.45, ims: 2.00, d: 'Mantenimiento y reparación de vehículos de motor' },
    '454': { it: 1.70, ims: 1.20, d: 'Venta, mantenimiento y reparación de motocicletas' },

    // 46 Comercio al por mayor (excepto 4623,4624,4632,4638,4672,4673,4674,4677,4690)
    '46':   { it: 1.40, ims: 1.20, d: 'Comercio al por mayor e intermediarios del comercio' },
    '4623': { it: 1.80, ims: 1.50, d: 'Comercio al por mayor de animales vivos' },
    '4624': { it: 1.80, ims: 1.50, d: 'Comercio al por mayor de cueros y pieles' },
    '4632': { it: 1.80, ims: 1.50, d: 'Comercio al por mayor de carne y productos cárnicos' },
    '4638': { it: 1.60, ims: 1.40, d: 'Comercio al por mayor de pescados, mariscos y otros productos alimenticios' },
    '4672': { it: 1.80, ims: 1.50, d: 'Comercio al por mayor de metales y minerales metálicos' },
    '4673': { it: 1.80, ims: 1.50, d: 'Comercio al por mayor de madera, materiales de construcción' },
    '4674': { it: 1.80, ims: 1.55, d: 'Comercio al por mayor de ferretería, fontanería y calefacción' },
    '4677': { it: 1.80, ims: 1.55, d: 'Comercio al por mayor de chatarra y productos de desecho' },
    '4690': { it: 1.80, ims: 1.55, d: 'Comercio al por mayor no especializado' },

    // 47 Comercio al por menor (excepto 473)
    '47':  { it: 0.95, ims: 0.70, d: 'Comercio al por menor' },
    '473': { it: 1.00, ims: 0.85, d: 'Comercio al por menor de combustible para la automoción' },

    // 49 Transporte terrestre y por tubería (excepto 494)
    '49':  { it: 1.80, ims: 1.50, d: 'Transporte terrestre y por tubería' },
    '494': { it: 2.00, ims: 1.70, d: 'Transporte de mercancías por carretera y servicios de mudanza' },

    // 50 Transporte marítimo y por vías navegables interiores
    '50': { it: 2.00, ims: 1.85, d: 'Transporte marítimo y por vías navegables interiores' },

    // 51 Transporte aéreo
    '51': { it: 1.90, ims: 1.70, d: 'Transporte aéreo' },

    // 52 Almacenamiento y actividades anexas al transporte (excepto 5221)
    '52':   { it: 1.80, ims: 1.50, d: 'Almacenamiento y actividades anexas al transporte' },
    '5221': { it: 1.00, ims: 1.10, d: 'Actividades anexas al transporte terrestre' },

    // 53 Actividades postales y de correos
    '53': { it: 1.00, ims: 0.75, d: 'Actividades postales y de correos' },

    // 55 Servicios de alojamiento
    '55': { it: 0.80, ims: 0.70, d: 'Servicios de alojamiento' },

    // 56 Servicios de comidas y bebidas
    '56': { it: 0.80, ims: 0.70, d: 'Servicios de comidas y bebidas' },

    // 58 Edición
    '58': { it: 0.65, ims: 1.00, d: 'Edición' },

    // 59 Actividades cinematográficas, de vídeo y de programas de televisión
    '59': { it: 0.80, ims: 0.70, d: 'Actividades cinematográficas, de vídeo y de programas de TV' },

    // 60 Actividades de programación y emisión de radio y televisión
    '60': { it: 0.80, ims: 0.70, d: 'Actividades de programación y emisión de radio y televisión' },

    // 61 Telecomunicaciones
    '61': { it: 0.80, ims: 0.70, d: 'Telecomunicaciones' },

    // 62 Programación, consultoría y otras actividades informáticas
    '62': { it: 0.80, ims: 0.70, d: 'Programación, consultoría y otras actividades informáticas' },

    // 63 Servicios de información (excepto 6391)
    '63':   { it: 0.65, ims: 1.00, d: 'Servicios de información' },
    '6391': { it: 0.80, ims: 0.70, d: 'Actividades de las agencias de noticias' },

    // 64 Servicios financieros
    '64': { it: 0.80, ims: 0.70, d: 'Servicios financieros, excepto seguros y fondos de pensiones' },

    // 65 Seguros, reaseguros y fondos de pensiones
    '65': { it: 0.80, ims: 0.70, d: 'Seguros, reaseguros y fondos de pensiones' },

    // 66 Actividades auxiliares a los servicios financieros y seguros
    '66': { it: 0.80, ims: 0.70, d: 'Actividades auxiliares a los servicios financieros y a los seguros' },

    // 68 Actividades inmobiliarias
    '68': { it: 0.65, ims: 1.00, d: 'Actividades inmobiliarias' },

    // 69 Actividades jurídicas y de contabilidad
    '69': { it: 0.80, ims: 0.70, d: 'Actividades jurídicas y de contabilidad' },

    // 70 Actividades de las sedes centrales; consultoría de gestión empresarial
    '70': { it: 0.80, ims: 0.70, d: 'Actividades de las sedes centrales; consultoría de gestión empresarial' },

    // 71 Servicios técnicos de arquitectura e ingeniería
    '71': { it: 0.65, ims: 1.00, d: 'Servicios técnicos de arquitectura e ingeniería; ensayos y análisis técnicos' },

    // 72 Investigación y desarrollo
    '72': { it: 0.80, ims: 0.70, d: 'Investigación y desarrollo' },

    // 73 Publicidad y estudios de mercado
    '73': { it: 0.90, ims: 0.80, d: 'Publicidad y estudios de mercado' },

    // 74 Otras actividades profesionales, científicas y técnicas (excepto 742)
    '74':  { it: 0.90, ims: 0.85, d: 'Otras actividades profesionales, científicas y técnicas' },
    '742': { it: 0.80, ims: 0.70, d: 'Actividades de fotografía' },

    // 75 Actividades veterinarias
    '75': { it: 1.50, ims: 1.10, d: 'Actividades veterinarias' },

    // 77 Actividades de alquiler
    '77': { it: 1.00, ims: 1.00, d: 'Actividades de alquiler' },

    // 78 Actividades relacionadas con el empleo (excepto 781)
    '78':  { it: 1.55, ims: 1.20, d: 'Actividades relacionadas con el empleo' },
    '781': { it: 0.95, ims: 1.00, d: 'Actividades de las agencias de colocación' },

    // 79 Actividades de las agencias de viajes, operadores turísticos
    '79': { it: 0.80, ims: 0.70, d: 'Actividades de las agencias de viajes, operadores turísticos' },

    // 80 Actividades de seguridad e investigación
    '80': { it: 1.40, ims: 2.20, d: 'Actividades de seguridad e investigación' },

    // 81 Servicios a edificios y actividades de jardinería (excepto 811)
    '81':  { it: 2.10, ims: 1.50, d: 'Servicios a edificios y actividades de jardinería' },
    '811': { it: 1.00, ims: 0.85, d: 'Servicios integrales a edificios e instalaciones' },

    // 82 Actividades administrativas de oficina (excepto 8220,8292)
    '82':   { it: 1.00, ims: 1.05, d: 'Actividades administrativas de oficina y otras auxiliares a las empresas' },
    '8220': { it: 0.80, ims: 0.70, d: 'Actividades de los centros de llamadas' },
    '8292': { it: 1.80, ims: 1.50, d: 'Actividades de envasado y empaquetado' },

    // 84 Administración Pública y defensa (excepto 842)
    '84':  { it: 0.65, ims: 1.00, d: 'Administración Pública y defensa; Seguridad Social obligatoria' },
    '842': { it: 1.40, ims: 2.20, d: 'Prestación de servicios a la comunidad en general' },

    // 85 Educación
    '85': { it: 0.80, ims: 0.70, d: 'Educación' },

    // 86 Actividades sanitarias (excepto 869)
    '86':  { it: 0.80, ims: 0.70, d: 'Actividades sanitarias' },
    '869': { it: 0.95, ims: 0.80, d: 'Otras actividades sanitarias' },

    // 87 Asistencia en establecimientos residenciales
    '87': { it: 0.80, ims: 0.70, d: 'Asistencia en establecimientos residenciales' },

    // 88 Actividades de servicios sociales sin alojamiento
    '88': { it: 0.80, ims: 0.70, d: 'Actividades de servicios sociales sin alojamiento' },

    // 90 Actividades de creación, artísticas y espectáculos
    '90': { it: 0.80, ims: 0.70, d: 'Actividades de creación, artísticas y espectáculos' },

    // 91 Actividades de bibliotecas, archivos, museos (excepto 9104)
    '91':   { it: 0.80, ims: 0.70, d: 'Actividades de bibliotecas, archivos, museos y otras culturales' },
    '9104': { it: 1.75, ims: 1.20, d: 'Actividades de los jardines botánicos, parques zoológicos y reservas naturales' },

    // 92 Actividades de juegos de azar y apuestas
    '92': { it: 0.80, ims: 0.70, d: 'Actividades de juegos de azar y apuestas' },

    // 93 Actividades deportivas, recreativas y de entretenimiento
    '93': { it: 1.70, ims: 1.30, d: 'Actividades deportivas, recreativas y de entretenimiento' },

    // 94 Actividades asociativas
    '94': { it: 0.65, ims: 1.00, d: 'Actividades asociativas' },

    // 95 Reparación de ordenadores, efectos personales (excepto 9524)
    '95':   { it: 1.50, ims: 1.10, d: 'Reparación de ordenadores, efectos personales y artículos de uso doméstico' },
    '9524': { it: 2.00, ims: 1.85, d: 'Reparación de muebles y artículos de menaje' },

    // 96 Otros servicios personales (excepto 9602,9603,9609)
    '96':   { it: 0.85, ims: 0.70, d: 'Otros servicios personales' },
    '9602': { it: 0.80, ims: 0.70, d: 'Peluquería y otros tratamientos de belleza' },
    '9603': { it: 1.80, ims: 1.50, d: 'Pompas fúnebres y actividades relacionadas' },
    '9609': { it: 1.50, ims: 1.10, d: 'Otros servicios personales n.c.o.p.' },

    // 97 Actividades de los hogares como empleadores de personal doméstico
    '97': { it: 0.80, ims: 0.70, d: 'Actividades de los hogares como empleadores de personal doméstico' },

    // 99 Actividades de organizaciones y organismos extraterritoriales
    '99': { it: 0.80, ims: 0.70, d: 'Actividades de organizaciones y organismos extraterritoriales' },
};

/**
 * Busca la tarifa AT para un código CNAE.
 * Intenta coincidencia exacta primero, luego recorta dígitos progresivamente.
 * @param {string} cnae - Código CNAE-2009 (2 a 4 dígitos)
 * @returns {{ it: number, ims: number, total: number, d: string, code: string } | null}
 */
function buscarTarifaAT(cnae) {
    const code = cnae.replace(/\D/g, '').replace(/^0+(\d{2,})$/, '$1');
    if (!code) return null;

    // Try exact match first, then progressively shorter parent codes
    for (let len = code.length; len >= 2; len--) {
        const key = code.substring(0, len);
        if (TARIFA_AT[key]) {
            const e = TARIFA_AT[key];
            return {
                it: e.it,
                ims: e.ims,
                total: +(e.it + e.ims).toFixed(2),
                d: e.d,
                code: key,
            };
        }
    }

    // Try with leading zero for single-digit lookups (e.g., input "1" → try "01")
    if (code.length === 1) {
        const key = '0' + code;
        if (TARIFA_AT[key]) {
            const e = TARIFA_AT[key];
            return {
                it: e.it,
                ims: e.ims,
                total: +(e.it + e.ims).toFixed(2),
                d: e.d,
                code: key,
            };
        }
    }

    return null;
}
