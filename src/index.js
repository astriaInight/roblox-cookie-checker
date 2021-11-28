// Vars
const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require("fs")
const filetypes = require("./modules/filetypes.json")
const colors = require("./modules/colors.json")
const axios = require("axios")

let userconf = {
  inputfile: null,
  outputfile: null,
  window: null,
  delay: 0.3
}
let validCookies = []
let invalidCookies = []

// Funcs
function sleep(s) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true)
    }, s * 1000)
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 520,
    minWidth: 720,
    minHeight: 350,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    },
    autoHideMenuBar: true
  })

  win.setIcon(path.join(__dirname, "../icons/64x64.png"))
  win.loadFile('src/index.html')
  userconf.window = win
};

function cookieValid(cookiestr) {
  return new Promise((resolve, reject) => {
      axios.post("https://presence.roblox.com/v1/presence/register-app-presence", {}, {
          headers: {
              "Cookie": `.ROBLOSECURITY=${cookiestr};`
          }
      })
      .then(res => {
        // This is unnecessary currently, as the request always errors
        // But im too lazy to remove it
          if (res.headers["X-CSRF-TOKEN"]) {
              resolve(true)
          } else {
              resolve(false)
          }
      })
      .catch(err => {
        // 403 = token error
        // x-csrf-token is returned even though it errors... interesting.
        // so we'll use that
        if (err.response.status === 403) {
          if (err.response.headers['x-csrf-token']) {
            resolve(true)
          }
        } else if (err.response.status === 401) {
          resolve(false)
        } else {
          // Any other errors should not happen
          // Reject
          reject(err)
        }
      })
  })
}

// Events
app.on('ready', createWindow);

ipcMain.on("setinputfile", function() {
  dialog.showOpenDialog(userconf, {defaultPath: __dirname, filters: filetypes}).then(res => {
    if (!res.canceled) {
      userconf.inputfile = res.filePaths[0]

      userconf.window.webContents.send("setinputfile", userconf.inputfile)
    }
  })
})
ipcMain.on("setoutputfile", function() {
  dialog.showSaveDialog(userconf, {defaultPath: __dirname, filters: filetypes}).then(res => {
    if (!res.canceled) {
      userconf.outputfile = res.filePath
      userconf.window.webContents.send("setoutputfile", userconf.outputfile)
    }
  })
})
ipcMain.on("setdelay", function(_, delay) {
  userconf.delay = delay
})

// Main start function
ipcMain.on("start", async function() {
  // Error checking
  if (!userconf.inputfile) {
    return dialog.showErrorBox("No input file set", "Missing arguments")
  } else if (!userconf.outputfile) {
    dialog.showMessageBox(userconf.window, {
      title: "Missing output file",
      message: "No output file set, defaulting to 'output.txt'."
    })
    userconf.outputfile = path.join(__dirname, "output.txt")
    userconf.window.webContents.send("logOutput", `Set output file: ${userconf.outputfile}`)
  }

  // Read files
  const inputFileData = fs.readFileSync(userconf.inputfile, "utf-8")
  const inputLines = inputFileData.split("\n")

  userconf.window.webContents.send("logOutput", "Read input file")

  // Analyze cookies
  for (cookie of inputLines) {
    const isValid = await cookieValid(cookie)

    if (isValid) {
      userconf.window.webContents.send("cookievalid")
      validCookies.push(cookie)
    } else {
      userconf.window.webContents.send("cookieinvalid")
      invalidCookies.push(cookie)
    }

    // Add delay after each cookie
    // to prevent ratelimiting
    // NOTE: delay is in seconds
    await sleep(userconf.delay)
  }

  // Compile & save
  const compiledCookies = validCookies.join("\n")
  userconf.window.webContents.send("logOutput", "Compiled cookies")

  try {
    fs.writeFileSync(userconf.outputfile, compiledCookies)
    userconf.window.webContents.send("logOutput", `Saved file to '${userconf.outputfile}'`)
  } catch(err) {
    userconf.window.webContents.send("logOutput", `Error saving file: ${err}`)
  }

  userconf.window.webContents.send("logOutput", "Finalizing...")
  userconf.window.webContents.send("logOutput", `${validCookies.length} valid cookies`, colors.green)
  userconf.window.webContents.send("logOutput", `${invalidCookies.length} invalid cookies`, colors.red)
  userconf.window.webContents.send("logOutput", "Done!", colors.green)
})

