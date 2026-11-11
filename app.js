const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxLkaLu2Fz9Mkl5vAzmuE_BvAe5wglx3T6NS8VUBa7VT9_0urt-6OxdNYN9vHIK6jyh/exec';
let chartInstance = null;
let fallaChartInstance = null;
let ticketsData = []; 
let proveedoresData = [];
let ticketValidacionActual = '';

// --- FUNCIONES DE MODALES ---
function abrirModalValidacion(ticketId) {
    ticketValidacionActual = ticketId;
    document.getElementById('valTicketId').textContent = ticketId;
    document.getElementById('valObservaciones').value = '';
    document.getElementById('valMsg').classList.add('hidden');
    document.getElementById('validacionModal').classList.remove('hidden');
}

function cerrarModalValidacion() {
    document.getElementById('validacionModal').classList.add('hidden');
    ticketValidacionActual = '';
}

function abrirModalPass() {
    document.getElementById('adminPass').value = '';
    document.getElementById('passModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('adminPass').focus(), 100);
}

function verificarClave() {
    if (document.getElementById('adminPass').value === "4TR4$") {
        document.getElementById('passModal').classList.add('hidden');
        document.getElementById('adminModal').classList.remove('hidden');
    } else { 
        alert("Acceso denegado."); 
    }
}

function cerrarAdmin() {
    document.getElementById('adminModal').classList.add('hidden');
    document.getElementById('adminForm').reset();
    document.getElementById('adminMsg').classList.add('hidden');
}

function abrirDashboard() { 
    document.getElementById('dashboardModal').classList.remove('hidden'); 
    actualizarDashboardUI(); 
}

function cerrarDashboard() { 
    document.getElementById('dashboardModal').classList.add('hidden'); 
}

// --- BÚSQUEDA ---
document.getElementById('buscador').addEventListener('input', function(e) {
    const filtro = e.target.value.toLowerCase();
    const filas = document.querySelectorAll('#tablaCuerpo tr');
    filas.forEach(fila => { 
        fila.style.display = fila.textContent.toLowerCase().includes(filtro) ? '' : 'none'; 
    });
});

// --- OPERACIONES PRINCIPALES ---
async function procesarValidacion(accion) {
    const obs = document.getElementById('valObservaciones').value.trim();
    
    if (accion === 'observar' && obs === '') {
        alert("Por favor, ingrese el motivo o las observaciones para devolver el ticket al proveedor.");
        document.getElementById('valObservaciones').focus();
        return;
    }

    const btnDevolver = document.getElementById('btnDevolver');
    const btnAprobar = document.getElementById('btnAprobar');
    const msg = document.getElementById('valMsg');
    
    btnDevolver.disabled = true; btnAprobar.disabled = true;
    msg.textContent = "Procesando...";
    msg.className = "text-sm text-center font-bold mb-4 text-blue-600 block";

    try {
        await fetch(APPS_SCRIPT_URL, { 
            method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ action: 'validarTicket', ticket: ticketValidacionActual, tipoAccion: accion, observacion: obs }) 
        });
        
        msg.textContent = accion === 'cerrar' ? "¡Ticket aprobado y cerrado!" : "¡Ticket devuelto al proveedor!";
        msg.className = accion === 'cerrar' ? "text-sm text-center font-bold mb-4 text-emerald-600 block" : "text-sm text-center font-bold mb-4 text-amber-600 block";
        
        setTimeout(() => { cerrarModalValidacion(); cargarDatosGenerales(); }, 1500);
    } catch (error) { 
        msg.textContent = "Error de red al procesar."; msg.className = "text-sm text-center font-bold mb-4 text-red-600 block"; 
    } finally {
        btnDevolver.disabled = false; btnAprobar.disabled = false;
    }
}

document.getElementById('adminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarProv');
    const msg = document.getElementById('adminMsg');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'; btn.disabled = true;
    try {
        await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ action: 'guardarProveedor', proveedor: document.getElementById('nuevoProveedor').value.toUpperCase().trim(), correos: document.getElementById('nuevoCorreos').value.toLowerCase().trim() }) });
        msg.textContent = "Guardado con éxito"; msg.className = "text-sm text-center font-bold mt-3 text-green-600 block";
        document.getElementById('adminForm').reset();
        setTimeout(() => { cerrarAdmin(); cargarDatosGenerales(); }, 1500);
    } catch (error) { 
        msg.textContent = "Error al guardar"; msg.className = "text-sm text-center font-bold mt-3 text-red-600 block"; 
    } finally { 
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Sincronizar Datos'; btn.disabled = false; 
    }
});

document.getElementById('ticketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ticketForm').querySelector('button');
    const msg = document.getElementById('statusMsg');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'; btn.disabled = true;
    try {
        await fetch(APPS_SCRIPT_URL, { 
            method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ action: 'nuevoTicket', proveedor: document.getElementById('proveedor').value, proyecto: document.getElementById('proyecto').value, unidad: document.getElementById('unidad').value.toUpperCase(), prioridad: document.getElementById('prioridad').value, asunto: document.getElementById('asunto').value, incidencia: document.getElementById('incidencia').value }) 
        });
        msg.textContent = "¡Ticket Desplegado!"; msg.className = "text-sm text-center font-bold mt-3 text-green-500 block";
        document.getElementById('ticketForm').reset();
        setTimeout(cargarDatosGenerales, 1500);
    } catch (error) { 
        msg.textContent = "Error de red"; msg.className = "text-sm text-center font-bold mt-3 text-red-500 block"; 
    } finally { 
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Desplegar Ticket'; btn.disabled = false; setTimeout(() => msg.classList.add('hidden'), 5000); 
    }
});

// --- CÁLCULOS Y LÓGICA DE DATOS ---
function parseHoras(t) {
    const estadoNorm = (t.estado || "").trim().toLowerCase();
    
    if (estadoNorm === 'cerrada' || estadoNorm === 'en verificación' || estadoNorm === 'en verificacion') {
        if (t.tiempo) {
            // Si tiene tiempo guardado en el Excel, lo usa
            return parseInt(t.tiempo.toString().replace(/\D/g, '')) || 0;
        } else {
            // CORRECCIÓN: Si el ticket está cerrado pero no tiene horas guardadas, devuelve 0 
            // para evitar que el tiempo siga corriendo infinitamente hasta el día de hoy.
            return 0; 
        }
    }
    // Si el ticket está abierto, calcula las horas desde que se creó hasta AHORA
    return Math.floor((new Date() - new Date(t.fecha)) / (1000 * 60 * 60));
}

function filtrarPorTemporalidad(tickets) {
    const modo = document.getElementById('filtroTemporalidad').value;
    if (modo === 'TODO') return tickets;
    const ahora = new Date();
    return tickets.filter(t => {
        const fechaTicket = new Date(t.fecha);
        if (modo === 'HOY') return fechaTicket.toDateString() === ahora.toDateString();
        if (modo === 'SEMANA') return (ahora - fechaTicket) / (1000 * 60 * 60 * 24) <= 7;
        if (modo === 'MES') return fechaTicket.getMonth() === ahora.getMonth() && fechaTicket.getFullYear() === ahora.getFullYear();
        if (modo === 'ANIO') return fechaTicket.getFullYear() === ahora.getFullYear();
        return true;
    });
}

// --- DASHBOARD Y GRÁFICOS ---
function actualizarDashboardUI() {
    const proveedorSel = document.getElementById('filtroDashboard').value;
    const proyectoSel = document.getElementById('filtroProyecto').value;
    
    let filtrados = ticketsData;
    if (proveedorSel !== "TODOS") filtrados = filtrados.filter(t => t.proveedor === proveedorSel);
    if (proyectoSel !== "TODOS") filtrados = filtrados.filter(t => t.proyecto === proyectoSel);
    filtrados = filtrarPorTemporalidad(filtrados);
    
    let atenciones = 0, sumaHoras = 0, cumplidosSLA = 0, totalCerradosOSLA = 0;
    const fallasConteo = { 'GPS': 0, 'Cámaras': 0, 'Energía': 0, 'Otros': 0 };
    
    filtrados.forEach(t => {
        // CORRECCIÓN: Ahora busca palabras clave tanto en el ASUNTO como en el DETALLE (incidencia)
        const textoBusqueda = ((t.asunto || "") + " " + (t.incidencia || "")).toLowerCase();
        const estadoNorm = (t.estado || "").trim().toLowerCase();
        
        if(textoBusqueda.includes('gps') || textoBusqueda.includes('satelital')) fallasConteo['GPS']++;
        else if(textoBusqueda.includes('camara') || textoBusqueda.includes('cámara') || textoBusqueda.includes('video')) fallasConteo['Cámaras']++;
        else if(textoBusqueda.includes('energia') || textoBusqueda.includes('energía') || textoBusqueda.includes('bateria') || textoBusqueda.includes('corriente')) fallasConteo['Energía']++;
        else fallasConteo['Otros']++;

        if(estadoNorm === 'cerrada' || estadoNorm === 'en verificación' || estadoNorm === 'en verificacion') {
            atenciones++;
            const h = parseHoras(t);
            sumaHoras += h;
            totalCerradosOSLA++;
            let limiteSLA = 48;
            if(t.prioridad === 'Crítica') limiteSLA = 4;
            else if(t.prioridad === 'Alta') limiteSLA = 24;
            if(h <= limiteSLA) cumplidosSLA++;
        }
    });

    document.getElementById('dash-total').textContent = filtrados.length;
    document.getElementById('dash-atenciones').textContent = atenciones;
    document.getElementById('dash-tiempo').textContent = atenciones > 0 ? Math.round(sumaHoras / atenciones) + ' hrs' : '0 hrs';
    document.getElementById('dash-sla').textContent = totalCerradosOSLA > 0 ? Math.round((cumplidosSLA / totalCerradosOSLA) * 100) + '%' : '100%';

    const ctx = document.getElementById('proveedorChart').getContext('2d');
    const ctxFalla = document.getElementById('fallaChart').getContext('2d');
    
    if (chartInstance) chartInstance.destroy();
    if (fallaChartInstance) fallaChartInstance.destroy();

    document.getElementById('leyendaEstados').style.display = proveedorSel === "TODOS" ? "none" : "flex";

    if (proveedorSel === "TODOS") {
        const labels = proveedoresData.map(p => p.nombre);
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Total Solicitudes', data: labels.map(l => filtrados.filter(t => t.proveedor === l).length), backgroundColor: '#cbd5e1', borderRadius: 6 },
                    { label: 'Atenciones Resueltas', data: labels.map(l => filtrados.filter(t => {
                        const st = (t.estado || "").trim().toLowerCase();
                        return t.proveedor === l && (st === 'cerrada' || st === 'en verificación' || st === 'en verificacion');
                    }).length), backgroundColor: '#1A52A0', borderRadius: 6 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, animation: { duration: 0 }, plugins: { legend: { position: 'top' } } }
        });
    } else {
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: filtrados.map(t => t.ticket),
                datasets: [{ 
                    label: 'Horas (SLA)', 
                    data: filtrados.map(t => parseHoras(t)), 
                    backgroundColor: filtrados.map(t => {
                        const st = (t.estado || "").trim().toLowerCase();
                        if(st === 'pendiente') return '#f59e0b';
                        if(st === 'en atención' || st === 'en atencion') return '#3b82f6';
                        if(st === 'en verificación' || st === 'en verificacion') return '#a855f7';
                        return '#10b981';
                    }), 
                    borderRadius: 6, maxBarThickness: 35 
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, animation: { duration: 0 }, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true } } }
        });
    }

    fallaChartInstance = new Chart(ctxFalla, {
        type: 'doughnut', data: { labels: ['GPS', 'Cámaras', 'Energía', 'Otros'], datasets: [{ data: [fallasConteo['GPS'], fallasConteo['Cámaras'], fallasConteo['Energía'], fallasConteo['Otros']], backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#cbd5e1'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 0 }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
    });
}

// --- FUNCIONES DE EXPORTACIÓN ---
function obtenerDatosFiltrados() {
    const prov = document.getElementById('filtroDashboard').value;
    const proy = document.getElementById('filtroProyecto').value;
    let filtrados = ticketsData;
    if (prov !== "TODOS") filtrados = filtrados.filter(t => t.proveedor === prov);
    if (proy !== "TODOS") filtrados = filtrados.filter(t => t.proyecto === proy);
    return filtrarPorTemporalidad(filtrados);
}

function exportarExcel() {
    const prov = document.getElementById('filtroDashboard').value;
    const proy = document.getElementById('filtroProyecto').value;
    const temp = document.getElementById('filtroTemporalidad').options[document.getElementById('filtroTemporalidad').selectedIndex].text;
    
    const kpiData = [
        ["SGMAP - REPORTE EJECUTIVO DE CONTROL SLA"],
        ["Fecha de Emisión:", new Date().toLocaleString()],
        ["Filtro Proveedor:", prov],
        ["Filtro Proyecto:", proy],
        ["Periodo:", temp],
        [],
        ["MÉTRICAS DE RENDIMIENTO"],
        ["Total Solicitudes:", document.getElementById('dash-total').textContent],
        ["Atenciones Finalizadas:", document.getElementById('dash-atenciones').textContent],
        ["Tiempo Promedio (hrs):", document.getElementById('dash-tiempo').textContent],
        ["Cumplimiento SLA:", document.getElementById('dash-sla').textContent],
        [],
        ["DETALLE DE ATENCIONES POR PROVEEDOR"]
    ];

    const filtrados = obtenerDatosFiltrados();
    const tableHeaders = ["Ticket ID", "Fecha y Hora", "Proveedor", "Proyecto", "Unidad", "Prioridad", "Estado", "Horas Consumidas", "Asunto", "Detalle de Falla"];
    const tableRows = filtrados.map(t => [
        t.ticket, t.fecha, t.proveedor, t.proyecto, t.unidad, t.prioridad, t.estado, parseHoras(t), t.asunto || "N/A", t.incidencia
    ]);

    const finalData = kpiData.concat([tableHeaders]).concat(tableRows);

    const ws = XLSX.utils.aoa_to_sheet(finalData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Ejecutivo");
    XLSX.writeFile(wb, `SGMAP_Reporte_${prov}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function exportarPDF() {
    const controles = document.getElementById('botonesExportacion');
    const btnCerrar = document.getElementById('btnCerrarDash');
    const elemento = document.getElementById('dashboardContent');
    const chartContainer = document.getElementById('contenedorGraficos');

    controles.style.display = 'none'; btnCerrar.style.display = 'none';
    elemento.classList.remove('h-[90vh]', 'overflow-y-auto', 'p-7', 'shadow-2xl');
    elemento.style.width = '1122px'; elemento.style.height = '760px'; elemento.style.padding = '1.25rem'; 
    
    if (chartContainer) chartContainer.classList.remove('min-h-[220px]');

    const divEncabezado = document.createElement('div');
    divEncabezado.id = "pdfHeader";
    divEncabezado.innerHTML = `
        <div style="text-align:center; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; margin-bottom: 15px;">
            <h1 style="color:#0B336A; font-family: sans-serif; font-size: 24px; font-weight: 800; margin:0;">SGMAP | REPORTE EJECUTIVO DE SLA</h1>
            <p style="color:#64748b; font-size: 12px; margin-top:5px;">Documento generado el: ${new Date().toLocaleString()}</p>
        </div>
    `;
    elemento.prepend(divEncabezado);

    if (chartInstance) chartInstance.resize();
    if (fallaChartInstance) fallaChartInstance.resize();

    const opt = { margin: 0.15, filename: `SGMAP_Reporte_SLA_${new Date().toISOString().slice(0,10)}.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' } };

    setTimeout(() => {
        html2pdf().set(opt).from(elemento).save().then(() => {
            controles.style.display = 'flex'; btnCerrar.style.display = 'flex'; document.getElementById('pdfHeader').remove();
            elemento.style.width = ''; elemento.style.height = ''; elemento.style.padding = '';
            elemento.classList.add('h-[90vh]', 'overflow-y-auto', 'p-7', 'shadow-2xl');
            
            if (chartContainer) chartContainer.classList.add('min-h-[220px]');
            if (chartInstance) chartInstance.resize();
            if (fallaChartInstance) fallaChartInstance.resize();
        });
    }, 350);
}

// --- CARGA DE DATOS INICIAL ---
async function cargarDatosGenerales() {
    const tbody = document.getElementById('tablaCuerpo');
    const selectProv = document.getElementById('proveedor');
    const filtroDash = document.getElementById('filtroDashboard');
    
    tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400 font-medium"><i class="fas fa-spinner fa-spin mr-2"></i> Sincronizando datos...</td></tr>';
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();
        ticketsData = data.tickets || data;
        proveedoresData = data.proveedores || [];

        if(proveedoresData.length > 0) {
            const prevProv = selectProv.value; const prevFiltro = filtroDash.value;
            selectProv.innerHTML = '<option value="">Seleccionar...</option>';
            filtroDash.innerHTML = '<option value="TODOS">Todos los Proveedores</option>';
            proveedoresData.forEach(prov => {
                selectProv.insertAdjacentHTML('beforeend', `<option value="${prov.nombre}">${prov.nombre}</option>`);
                filtroDash.insertAdjacentHTML('beforeend', `<option value="${prov.nombre}">${prov.nombre}</option>`);
            });
            selectProv.value = prevProv; filtroDash.value = prevFiltro || 'TODOS';
        }

        tbody.innerHTML = '';
        let abiertos = 0, proximos = 0, vencidos = 0;
        
        ticketsData.forEach(t => { 
            const estadoNorm = (t.estado || "").trim().toLowerCase();
            let colorEstado = 'bg-slate-100 text-slate-600', htmlSLA = '', botonAccion = '';
            let rowClass = "hover:bg-slate-50 transition-colors border-b border-slate-50", rowIcon = "";

            const horasReales = parseHoras(t); // Siempre calcula las horas exactas

            if (estadoNorm !== 'cerrada') {
                abiertos++;
                let limiteSLA = 48; 
                if (t.prioridad === 'Crítica') limiteSLA = 4;
                else if (t.prioridad === 'Alta') limiteSLA = 24;
                
                let umbralRiesgo = limiteSLA * 0.75; 

                // Asignación visual a las tarjetas superiores
                if (horasReales >= limiteSLA) { 
                    vencidos++; 
                    htmlSLA = `<span class="text-red-500 font-bold">${horasReales} hrs</span>`; 
                } else if (horasReales >= umbralRiesgo) { 
                    proximos++; 
                    htmlSLA = `<span class="text-amber-500 font-bold">${horasReales} hrs</span>`; 
                } else { 
                    htmlSLA = `<span class="text-slate-600 font-medium">${horasReales} hrs</span>`; 
                }

                // Diseño visual de la fila
                if (horasReales >= limiteSLA || t.prioridad === 'Crítica') { 
                    rowClass = "bg-red-50 hover:bg-red-100 border-b border-red-100"; 
                    rowIcon = `<i class="fas fa-circle text-[8px] text-red-500 mr-2 animate-pulse"></i>`; 
                } else if (horasReales >= umbralRiesgo) { 
                    rowClass = "bg-amber-50/50 hover:bg-amber-100 border-b border-amber-100"; 
                    rowIcon = `<i class="fas fa-exclamation-triangle text-[10px] text-amber-500 mr-2"></i>`; 
                }
            } else { 
                // CORRECCIÓN: Para tickets cerrados, ahora muestra el tiempo exacto consumido en lugar de "Ok"
                htmlSLA = `<span class="text-slate-600 font-bold">${horasReales} hrs</span>`; 
            }

            // Asignación de colores, botones y etiquetas según estado
            if(estadoNorm === 'pendiente') { 
                colorEstado = 'bg-amber-50 text-amber-600 border border-amber-200'; 
                // CORRECCIÓN: Ya no muestra un guion "-"
                botonAccion = `<span class="text-slate-400 text-[11px] italic font-medium"><i class="fas fa-hourglass-half mr-1 text-slate-300"></i> Esperando al proveedor</span>`;
            } 
            else if(estadoNorm === 'en atención' || estadoNorm === 'en atencion') { 
                colorEstado = 'bg-blue-50 text-blue-600 border border-blue-200'; 
                botonAccion = `<span class="text-slate-400 text-[11px] italic font-medium"><i class="fas fa-tools mr-1 text-slate-300"></i> En manos del proveedor</span>`;
            } 
            else if(estadoNorm === 'en verificación' || estadoNorm === 'en verificacion') { 
                colorEstado = 'bg-purple-50 text-purple-600 font-bold'; 
                botonAccion = `<button onclick="abrirModalValidacion('${t.ticket}')" class="bg-purple-100 hover:bg-purple-600 hover:text-white text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"><i class="fas fa-clipboard-check mr-1"></i> Validar</button>`; 
            } else if(estadoNorm === 'cerrada') { 
                colorEstado = 'bg-emerald-50 text-emerald-600 border border-emerald-200'; 
                // Muestra un pequeño check sutil cuando ya está cerrado
                botonAccion = `<i class="fas fa-check text-emerald-200"></i>`;
            }
            
            const estadoVisible = t.estado || 'Desconocido';

            tbody.insertAdjacentHTML('beforeend', `<tr class="${rowClass}"><td class="px-6 py-4 font-bold text-slate-800">${rowIcon}${t.ticket}</td><td class="px-6 py-4 font-medium text-slate-500">${t.proveedor}</td><td class="px-6 py-4 font-bold text-slate-700 uppercase">${t.unidad}</td><td class="px-6 py-4"><span class="${colorEstado} py-1 px-3 rounded-full text-xs">${estadoVisible}</span></td><td class="px-6 py-4">${htmlSLA}</td><td class="px-6 py-4 text-center">${botonAccion}</td></tr>`);
        });
        
        document.getElementById('kpi-abiertos').textContent = abiertos; 
        document.getElementById('kpi-proximos').textContent = proximos; 
        document.getElementById('kpi-vencidos').textContent = vencidos;
        
        if(!document.getElementById('dashboardModal').classList.contains('hidden')) actualizarDashboardUI();
    } catch (error) { 
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-red-400"><i class="fas fa-wifi mr-2"></i> Error de conexión</td></tr>'; 
    }
}

document.addEventListener('DOMContentLoaded', cargarDatosGenerales);
