window.addEventListener("DOMContentLoaded", function() {
    // Vars
    const { ipcRenderer, ipcMain } = require("electron")
    const axios = require("axios")
    const colors = require("./modules/colors.json")

    // Funcs
    function logOutput(text, color) {
        let outputItem = document.createElement("p")
        outputItem.className = "output-item"
        outputItem.innerText = text

        if (color) outputItem.style.color = color

        let nothingHere = document.getElementById("nothing-here")
        if (nothingHere.style.display !== "none") {
            nothingHere.style.display = "none"
        }
        
        let outputElem = document.getElementById("output")
        outputElem.appendChild(outputItem)

        // Auto scroll to bottom of output
        outputElem.scrollTo(0, outputElem.scrollHeight)
    }

    // Events
    ipcRenderer.on("setinputfile", function(_, inputfile) {
        document.getElementById("inputfilepath").innerText = inputfile
        logOutput(`Set input file: ${inputfile}`)
    })
    ipcRenderer.on("setoutputfile", function(_, outputfile) {
        document.getElementById("outputfilepath").innerText = outputfile
        logOutput(`Set output file: ${outputfile}`)
    })

    ipcRenderer.on("cookievalid", function() {
        logOutput("Cookie valid", colors.green)
    })
    ipcRenderer.on("cookieinvalid", function() {
        logOutput("Cookie invalid", colors.red)
    })

    ipcRenderer.on("logOutput", function(_, text, color) {
        logOutput(text, color)
    })

    // Buttons & inputs
    document.getElementById("inputfile").onclick = function() {
        ipcRenderer.send("setinputfile")
    }
    document.getElementById("outputfile").onclick = function() {
        ipcRenderer.send("setoutputfile")
    }
    document.getElementById("startbtn").onclick = function() {
        ipcRenderer.send("start")
    }
    document.getElementById("delay-input").onchange = function(delayText) {
        ipcRenderer.send("setdelay", parseFloat(delayText))
    }

    // Run
    
})