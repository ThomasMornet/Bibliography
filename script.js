
document.addEventListener('load', ()=>{
    let input=document.getElementById('input-file-name')
    document.getElementById('ghost').textContent=input.value || input.placeholder

    updateSaveState()
})


const tabs = ["Book.csv", "Review.csv", "Video.csv", "Web_Site.csv","Images.csv"]
const sheets=[
    "biblioTable-Books",
    "biblioTable-Review",
    "biblioTable-Video",
    "biblioTable-Website",
    "biblioTable-Images"
]

let currentTab=0
let up = new URLSearchParams(location.search)
let db
let saveState=2
let isSaved=false


let saveTimeout
document.getElementById('sheet-container').addEventListener('input', () => {
    triggerSave()
})

document.getElementById('file-name-div').addEventListener('input', () => {
    triggerSave()
})


function triggerSave(){
    saveState=2
    updateSaveState()
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(autoSave, 1000)
}

fetch('tables.json')
    .then(res => res.json())
    .then(res => {
        db=res
        init()
    })

function init(){
    createTables()
    if (up.get('tab')){
        currentTab=Number(up.get('tab'))
        ChangeTab(currentTab)
    }

    LoadSaveFile(localStorage.getItem('FileName_sav'),JSON.parse(localStorage.getItem('Tables_sav')))
}

function createTables(){
    for (let i in db.Tables){
        let th=""
        for (let e in db.Tables[i]){
            th+=`<th>${db.Tables[i][e]}</th>\n`
        }
        let html=`
            <table id="biblioTable-${i}" style="display:none;">
                <thead>
                    <tr>
                        <th class="row-index">#</th>
                        ${th}
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        `

        document.getElementById('sheet-container').innerHTML+=html

        document.getElementById('biblioTable-'+i).addEventListener('keydown', function(e) {
            const activeElement = document.activeElement
            
            if (activeElement.tagName === 'INPUT' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                const currentCell = activeElement.closest('td')
                const currentRow = currentCell.parentElement
                const columnIndex = Array.from(currentRow.children).indexOf(currentCell)
                
                let targetRow

                if (e.key === 'ArrowDown') {
                    targetRow = currentRow.nextElementSibling
                    e.preventDefault()
                } else if (e.key === 'ArrowUp') {
                    targetRow = currentRow.previousElementSibling
                    e.preventDefault()
                }

                if (targetRow) {
                    const targetInput = targetRow.children[columnIndex].querySelector('input')
                    if (targetInput) {
                        targetInput.focus()
                        // Optionnel : sélectionne tout le texte pour faciliter l'édition rapide
                        // targetInput.select()
                    }
                }
            }
        })
    } 
}

function ChangeTab(i){
    currentTab=i
    up.set('tab',i)
    history.replaceState({ id: "100" },location.pathname+location.search,location.pathname+'?'+up.toString())

    
    for (let e in Array.from(document.getElementById('tabs-nav').children)){
        document.getElementById('tabs-nav').children[e].classList.remove('active')
        document.getElementById(sheets[e]).style.display='none'
    }
    document.getElementById('tabs-nav').children[i].classList.add('active')
    document.getElementById(sheets[i]).style.display='block'

    document.getElementById('type-tab').innerHTML=document.getElementById('tabs-nav').children[i].innerText
}

function createRow(values=[],index=-1){
    if (index===-1){
        index=currentTab
    }
    let col=document.getElementById(sheets[index]).rows[0].cells.length-1
    let row=document.getElementById(sheets[index]).rows.length
    if (!values || values.length!==col){
        values=[]
        for (let i=0;i<col;i++){
            values.push("")
        }
    }

    let html = `<tr><td class="row-index">${row}</td>`
    values.forEach(val => {
        html += `
        <td>
            <div class="cell-wrapper" data-value="${val}">
                <input type="text" class="cell-input" value="${val}" oninput="this.parentElement.setAttribute('data-value', this.value)">
            </div>
        </td>`
    })
    html += `</tr>`
    document.getElementById(sheets[index]).getElementsByTagName('tbody')[0].innerHTML+=html
}

function clearTable(i=-1) {
    if (i==-1) i=currentTab
    const rows = document.querySelectorAll(`#${sheets[i]} tbody tr`)
    rows.forEach(row => {row.remove()})
}

function clearTables(){
    for (let i in sheets){
        clearTable(i)
    }
}

function cleanEmptyRows() {
    const rows = document.querySelectorAll(`#${sheets[currentTab]} tbody tr`)
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input')
        let isEmpty = true
        inputs.forEach(input => {
            if (input.value.trim() !== "") isEmpty = false
        });
        
        if (isEmpty) {
            row.remove()
        }
    });
    reindexRows()
}

function reindexRows() {
    const rows = document.querySelectorAll(`#${sheets[currentTab]} tbody tr`)
    rows.forEach((row, index) => {
        row.querySelector('.row-index').innerText = index + 1
    })
}


async function exportProjectAsZip() {
    const zip = new JSZip()

    tabs.forEach((tabName,index) => {
        zip.file(`${tabName}`, tableToCSV(index))
    })

    const content = await zip.generateAsync({ type: "blob" })

    const link = document.createElement("a")
    link.href = URL.createObjectURL(content)
    link.download =( document.getElementById('input-file-name').value || document.getElementById('input-file-name').placeholder)+".bg"
    link.click()
}

function tableToCSV(i) {
    const rows = document.querySelectorAll(`#${sheets[i]} tr`)
    let csv = []
    
    rows.forEach(row => {
        const cols = row.querySelectorAll("th, td")
        const rowData = []
        
        cols.forEach((col, index) => {
            if (index === 0) return
            if (col.tagName === "TH") {
                rowData.push(`"${col.innerText}"`)
            } else {
                const input = col.querySelector("input")
                rowData.push(`"${input ? input.value.replace(/"/g, '""') : ""}"`)
            }
        })
        csv.push(rowData.join(";"))
    })
    
    return csv.join("\n")
}

function ImportFile(){
    document.getElementById('fileDialog').click()
}

document.getElementById('fileDialog').addEventListener('change',async function(e){
    file=e.target.files[0]
    if (!file) return

    const zip = new JSZip()
    try {
        const zipContent = await zip.loadAsync(file)
        const files = Object.keys(zipContent.files)

        let g=true
        for (let i in files){
            if (files[i]!==tabs[i]){
                g=false
            }
        }
        if (g){
            let data=[]
            for (let i=0; i<files.length;i++){
                data.push(await zipContent.files[files[i]].async("string"))
            }
            LoadSaveFile(e.target.files[0].name.replace(".bg",""),data,()=>{
                autoSave()
            })
        }else{
            alert("Le fichier n'est pas un projet Biblio.graphy valide.")
        }
    } catch (err) {
        console.error("Erreur lors de l'import :", err)
        alert("Le fichier n'est pas un projet Biblio.graphy valide.")
    }
})

function LoadSaveFile(filename,data=null,after){
    clearTables()

    let input=document.getElementById('input-file-name')
    input.value=filename
    document.getElementById('ghost').textContent=input.value || input.placeholder

    for (let i in data){
        let csv=data[i].replaceAll('"',"").split("\n")
        for (let e=1;e<csv.length;e++){
            row=csv[e].split(";")
            createRow(row,index=i)
        }
    }

    saveState=0
    updateSaveState()

    if (after){
        after()
    }
}

function updateSaveState(){
    let s=[
        `<i class="fa-solid fa-circle-check"></i> Enregistré`,
        `<i class="fa-solid fa-floppy-disk fa-bounce"></i> Enregistrement...`,
        `<i class="fa-solid fa-circle-xmark"></i> Non Enregistré`
    ]
    document.getElementById('save-info').innerHTML=s[saveState]
}

function autoSave() {
    saveState=1
    updateSaveState()
    setTimeout(()=>{
        const dataToSave = [];
        sheets.forEach((e,i) => {
            dataToSave.push(tableToCSV(i))
        })
        localStorage.setItem('FileName_sav', document.getElementById('input-file-name').value)
        localStorage.setItem('Tables_sav', JSON.stringify(dataToSave))
        saveState=0
        updateSaveState()
    },1000)
}

function closeModals(){
    document.getElementById('modals').style.display="none"
}

function openModal(ind){
    document.getElementById('modals').style.display="flex"
    for (let i in Array.from(document.getElementById('modals').children)){
        if (i==ind){
            document.getElementById('modals').children[i].style.display="block"
        }else{
            document.getElementById('modals').children[i].style.display="none"
        }
    }
}

function newProject(){
    let v=confirm("Certaines données n'ont peut être pas été enregistrées. Êtes-vous sûr de vouloir créer un nouveau projet?")

    if (v){
        localStorage.removeItem('FileName_sav')
        localStorage.removeItem('Tables_sav')

        clearTables()
         document.getElementById('input-file-name').value=""
        let input=document.getElementById('input-file-name')
        document.getElementById('ghost').textContent=input.value || input.placeholder
    }
}



function FormatLink(){
    let regExp=new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi)
    
    document.getElementById('textRender').innerHTML=String(document.getElementById('textRender').innerHTML).replaceAll(regExp,(m)=>`<div contentEditable="false" style="display: inline-block;"><a href='${m}' target="_blank">${m}</a></div>`)

}

function generateRender(){
    let text=""
    let title=[
        "Livres:\n",
        "Revues:\n",
        "Vidéos:\n",
        "Sites Web:\n",
        "Images:\n",
    ]
    let format=[
        (r)=>{
            return String(r[0]).toUpperCase()+(r[1] ? ", "+r[1] : "")+". "+r[2]+". "+r[3]+", "+r[4]+". "+r[5]
        },
        (r)=>{
            return String(r[0]).toUpperCase()+(r[1] ? ", "+r[1] : "")+". "+r[2]+". "+r[3]+", "+r[4]+", "+r[5]+". "+r[6]
        },
        (r)=>{
            return String(r[0]).toUpperCase()+(r[1] ? ", "+r[1] : "")+". "+r[2]+". "+r[3]+". "+r[4]+". "+r[5]+". "+r[6]+". Disponible Sur: "+r[7]
        },
        (r)=>{
            let siteName=""
            try {siteName=new URL(r[7]).hostname.replace("www.","")}catch{}
            return String(r[0]).toUpperCase()+(r[1] ? ", "+r[1] : "")+". '"+r[2]+"'. In: "+siteName+" [en ligne]. "+r[3]+", Publié le "+r[4]+", Mis à jour le "+r[5]+" [Consulté le "+r[6]+"]. Disponible Sur: "+r[7]
        },
        (r)=>{
            let siteName=""
            try {siteName=new URL(r[5]).hostname.replace("www.","")}catch{}
            return String(r[0]).toUpperCase()+(r[1] ? ", "+r[1] : "")+". "+r[2]+" ["+r[3]+"]. In: "+siteName+" [en ligne]. Publié le "+r[4]+". Disponible Sur: "+r[5]
        },
    ]
    
    for (let t in sheets){
        text+=title[t]
        let csv=tableToCSV(t).replaceAll('"',"").split("\n")
        for (let e=1;e<csv.length;e++){
            row=csv[e].split(";")

            text+=format[t](row)
            if (e!==csv.length-1) text+="\n"
        }
        if (t!=sheets.length-1) text+="\n\n\n"
    }
    
    document.getElementById('textRender').innerText=text
    FormatLink()

    openModal(1)
}   


