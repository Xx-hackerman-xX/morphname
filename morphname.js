// ==UserScript==
// @name         MorphName
// @version      1.3
// @description  automagically change name on libpol
// @match        *://*.libpol.org/*
// @icon         https://jej.lol/posts/[www.jej.lol]%20pjsk%20project_sekai%20hatsune_miku%20miku%20stamp%20lasagna%20lasagnya%20-%2016675.png
// @run-at       document-idle
// @grant        none
// @author       github.com/Xx-hackerman-xX
// @downloadURL  https://raw.githubusercontent.com/Xx-hackerman-xX/morphname/refs/heads/main/morphname.js
// ==/UserScript==


/*

  todo

  - add warnings
    - name too long
    - missing {0} in template
    - invalid current
    - invalid increment
  - set warnings as just strings that get added to a styled warning parent

*/



const changelogHeader = `morphname has updated to v${GM_info.script.version} :)`
const changelogBody = `CHANGELOG

new:
+ add ordinal suffixes (st, nd, rd, th) with {1}
+ add reference for what the different things do
+ new icon

fixed:
~ changelog displays good and proper now

lemme know if you find any bugs ok thanks bye

click to close...`


const SVG_REFRESH = `<svg class="svg-refresh" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21C7.02944 21 3 16.9706 3 12C3 9.69494 3.86656 7.59227 5.29168 6L8 3M12 3C16.9706 3 21 7.02944 21 12C21 14.3051 20.1334 16.4077 18.7083 18L16 21M3 3H8M8 3V8M21 21H16M16 21V16"/></svg>`

const HTML_WARNING_NAMETOOLONG = `<div id="morph-warning-nametoolong" style="display:none;">HEY your generated name is more than 50 characters, so it's been cut short. just so you know. ok thanks</div>`

const HTML_TABLE_NEXTNAMEPREVIEW = `<tr>
	<td><label for="morph-preview" title="preview of your next name">next name</label></td>
	<td><input name="morph-preview" id="morph-preview" type="text" maxlength="50" disabled><td>
<tr>`


const HTML_TABLE_CONFIG = `<div class='spacer'></div>
<tr>
	<td><label for="morph-switch" title="enable morphname, and disable manual name editing">Enable MorphName</label></td>
  <td><input name="morph-switch" id="morph-switch" title="enable morphname, and disable manual name editing" type="checkbox" hecked></td>
</tr>
<tr>
	<td><label for="morph-template" title="the string {0} will be replaced by your number above">name template</label></td>
	<td><input name="morph-template" id="morph-template" type="text" maxlength="40" title="the string {0} will be replaced by your number above"><td>
</tr>
<tr>
	<td><label for="morph-current" title="current number for {0}">current value</label></td>
	<td><input name="morph-current" id="morph-current" type="text" maxlength="6" title="current number for {0}"><td>
</tr>
<tr>
	<td><label for="morph-increment" title="how much the number {0} will increment by after each post">increment by</label></td>
	<td><input name="morph-increment" id="morph-increment" type="text" maxlength="6" title="how much the number {0} will increment by after each post"><td>
</tr>
<tr data-id="morph-reset">
	<input id="morph-reset" type="submit" value="reset morphname" title="reset settings to default">
</tr>
`

const HTML_REFERENCE = `<div class='spacer'></div>
<div><b>Reference</b></div>
<div>{0} = the incrementing number</div>
<div>{1} = ordinal suffix (st, nd, rd, th)</div>
`

// localstorage keys
const KEY_MORPHNAME_ENABLED = "morph-switch"
const KEY_CURRENT_MODE = "morphname_currentMode"
const KEY_NAME_TEMPLATE = "morph-template"
const KEY_UPDATE_MESSAGE_SHOWN = "morphname_updateMessageShown"
const KEY_INCREMENTING_CURRENT = 'morph-current'
const KEY_INCREMENTING_DIFF = 'morph-increment'
const KEY_NORMAL_NAME = "morphname_previousName"
// const KEY_RANDOMINT_CURRENT = 'morphname_randomInt_current'
// const KEY_RANDOMINT_MAX = 'morphname_randomInt_max'

// mode keys
const MODE_INCREMENT = "increment"  // add a number to your name
// const MODE_RANDOMINT = "randomInt"  // change number randomly
// const MODE_RANDOMSTRING = "randomString"  // add


// just a buncha default values
const DEFAULTS = {
  enabled: true,
  currentMode: MODE_INCREMENT,

  nameTemplate: "{0}% anon",

  incrementStartingValue: 0,
  incrementDiff: 0.1,

  // randomIntMax: 100,
  // randomIntTemplate: "anon no. {0}",
}


// manipulator functions for each mode
const MODES = {
  increment: {

    // current value: the number that will be placed into the name template
    getCurrent: function() {
      let current = getStorage(KEY_INCREMENTING_CURRENT) || DEFAULTS.incrementStartingValue
      return Number(current)
    },
    setCurrent: function(value) {
      if (isNaN(value)) {
        return
      }
      setStorage(KEY_INCREMENTING_CURRENT, value)
    },

    // increment: how much the next name will change when making a post
    getIncrement: function () {
      let increment = getStorage(KEY_INCREMENTING_DIFF) || DEFAULTS.incrementDiff
      return Number(increment)
    },
    setIncrement: function(value) {
      if (isNaN(value)) {
        return
      }
      setStorage(KEY_INCREMENTING_DIFF, value)
    },

    // get next value and update localstorage accordingly
    getNext: function(preview=false) {
      let current = MODES.increment.getCurrent()
      let increment = MODES.increment.getIncrement()
      let nextValue = current + increment
      nextValue = strip(nextValue, getFloatingPrecision(increment))  // remove trailing float precision
      if (!preview) {
        MODES.increment.setCurrent(nextValue)
      }
      return nextValue
    },

    // reset to default values
    clear: function() {
      MODES.increment.setCurrent(DEFAULTS.incrementStartingValue)
      MODES.increment.setIncrement(DEFAULTS.incrementDiff)
    }
  },
}


// interact w/name template (general across all modes)
const NAME_TEMPLATE = {
  get: function() {
    return getStorage(KEY_NAME_TEMPLATE) || DEFAULTS.nameTemplate
  },
  set: function(value) {
    setStorage(KEY_NAME_TEMPLATE, value)
  },
  clear: function() {
    setStorage(KEY_NAME_TEMPLATE, DEFAULTS.nameTemplate)
  }
}

// toggle states
const STATE = {
  enabled: {
    get: function() {
      let enabled = getStorage(KEY_MORPHNAME_ENABLED) || DEFAULTS.enabled
      return JSON.parse(enabled)  // parse AFTER getting from storage or else a false in storage will make us || to default >:(
    },
    set: function(enabled) {
      setStorage(KEY_MORPHNAME_ENABLED, enabled)
    },
  },
  currentMode: {
    get: function() {
      return getStorage(KEY_CURRENT_MODE) || DEFAULTS.currentMode
    },
    set: function(mode) {
      setStorage(KEY_CURRENT_MODE, mode)
    },
  },
  nameTooLong: false,
}


// find the correct window.require namespace
var configState = "state"
var configIdentity = "posts/posting/identity"
try {
  window.require.config(configState)  // does nothing, just check if it exists
} catch {  // we're on a page that requires "client" to be prepended for whatever reason
  configState = "client/" + configState
  configIdentity = "client/" + configIdentity
}

const vanillaStoreMine = window.require.config(configState).storeMine




/* name stuff */

function setName(name) {
  /* set a new name as if user typed it themselves */
  // truncate names that are too long and set the warning flag
  if (name.length > 50) {
    name = name.substr(0, 50)
    STATE.nameTooLong = true
  } else {
    STATE.nameTooLong = false
  }
  // set the name everywhere that it matters
  document.getElementById("name").value = name  // identity panel field
  window.require.config(configIdentity).default.name = name  // for the code itself
  localStorage.setItem('name', name)  // to survive a refresh
}

function updateNextName() {
  /* process the next iteration of our name and set it */
  let template = NAME_TEMPLATE.get()
  let value = MODES[STATE.currentMode.get()].getNext()
  let newName = template.format(value, getOrdinal(value))
  setName(newName)
}

function saveNormalName() {
  /* save non-morphed name to storage so it can be restored later */
  normalName = document.getElementById("name").value
  setStorage(KEY_NORMAL_NAME, normalName)
}

function restoreNormalName() {
  /* spit saved non-morphed name back onto the page */
  normalName = getStorage(KEY_NORMAL_NAME) || "anon"
  setName(normalName)
}

function updateGUI() {
  /* update the identity panel with all our shit */
  let enabled = STATE.enabled.get()
  let mode = STATE.currentMode.get()
  let template = NAME_TEMPLATE.get()
  let value = MODES[mode].getCurrent()
  let increment = MODES[mode].getIncrement()

  value = strip(value, getFloatingPrecision(increment))  // to retain whatever precision we current have (else 7.0 turns into just 7)

  // update fields in gui
  let nameTemplateInput = document.getElementById("morph-template")
  nameTemplateInput.value = template
  let currentValueInput = document.getElementById("morph-current")
  currentValueInput.value = value
  let incrementInput = document.getElementById("morph-increment")
  incrementInput.value = increment

  // everything after this is only run when script active
  if (!enabled) {
    return
  }

  // update name
  let newName = template.format(value, getOrdinal(value))
  setName(newName)

  // warn user if it's too long
  let nameTooLongWarning = document.getElementById("morph-warning-nametoolong")
  nameTooLongWarning.style.display = STATE.nametoolong ? "" : "none"

  // display preview of next name
  let nextValue = MODES[STATE.currentMode.get()].getNext(preview=true)
  document.getElementById("morph-preview").value = template.format(nextValue, getOrdinal(nextValue))

}



function getOrdinal(number) {
  /* return ordinal for this number (st, nd, rd, th) */
  number = number.toString()  // just in case

  // between 10 and 20 is all th
  if (number.at(-2) === "1") {
    return "th"
  }

  // depends on last digit
  switch (number.at(-1)) {
    case "1":
      return "st";
      break;
    case "2":
      return "nd";
      break;
    case "3":
      return "rd";
      break;
    default:
      return "th"
  }
}




/* html & css */

const LOVELY_CSS = `
.overlay-message-morphname {
  background-color: #001db7;
  border: 6px dashed #4965ff;
  box-shadow: inherit;
  width: auto;
}

.morphname-button {
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px black solid;
  border-radius: 4px;
  cursor: pointer;
  height: 26px;
}

/*
.morphname-rainbow {
  color: white;
  background: linear-gradient(120deg, red, orange, green, blue);
  text-shadow: -1px -1px 1px black, 1px -1px 1px black, -1px 1px 1px black, 1px 1px 1px black;
}
.morphname-rainbow:hover {
  border-color: white;
}
*/

.svg-refresh {
  width: 16px;
  stroke: black;
  stroke-width: 2;
  stroke-linecap: round;
  transition: 0.4s;
}
.morphname-button:hover:not([disabled]) .svg-refresh {
  transform: rotate(25deg);
}
.morphname-button:active:not([disabled]) .svg-refresh {
  transition: 0.1s;
  transform: rotate(70deg);
}

#name:disabled {
  background: black;
  color: white;
  cursor: not-allowed;
}

.spacer {
  padding-top: 10px;
}
label[for="morph-switch"] {
  font-weight: bold;
}

#morph-warning-nametoolong {
  background: red;
  color: white;
  padding: 10px;
}

#morph-preview {
  color: black;
}

label[for='morph-switch']:not(.giga-global-sig) {
  color: darkorange;
}

`

function addCSS() {
  /* ooh ahh so pretty */
  let style = document.createElement("style")
  style.innerText = LOVELY_CSS
  document.head.append(style)
}

function displayOverlayMessage(headerText, bodyText, closingFunction=null) {
  /* display a little overlay message like vanilla js. click to fire optional function and remove overlay */
  let overlayMessage = document.createElement("div")
  overlayMessage.classList.add("overlay-message", "overlay-message-morphname")
  let header = document.createElement("div")
  header.classList.add("overlay-message-header")
  header.textContent = headerText
  let body = document.createElement("b")
  body.classList.add("overlay-message-text")
  body.innerHTML = bodyText.replaceAll("\n","<br>")
  overlayMessage.append(header, body)
  overlayMessage.addEventListener(
    "click", (clickEvent) => {
      // remove the parent overlay-message
      if (closingFunction) { closingFunction() }
      clickEvent.target.closest(".overlay-message").remove()
    }
  )
  document.getElementById("modal-overlay").append(overlayMessage)
}

function flashNameField() {
  /* for EMPHASIS!!!!!!!!!!!!!! */
  document.getElementById("name").style.borderColor = "red"
  setTimeout( () => {
    document.getElementById("name").style.borderColor = ""
  }, 100)
}

function showChangelog(delay=3000) {
  /* show current changelog if it hasn't been seen already */
  let currentVersion = GM_info.script.version
  if (getStorage(KEY_UPDATE_MESSAGE_SHOWN) === currentVersion) {
    return
  }
  setTimeout( () => {
    displayOverlayMessage(
      changelogHeader,
      changelogBody,
      closingFunction=() => {
        // set value to current version so future updates will show they changelogs
        setStorage(KEY_UPDATE_MESSAGE_SHOWN, currentVersion)
      })
  }, delay)
}

function addMorphnameControls() {
  /* add controls and functions to control morphname from webpage */
  let tableParent = document.querySelector("#identity tbody")  // inner table of identity panel
  tableParent.insertAdjacentHTML('beforeend', HTML_TABLE_CONFIG)
  tableParent.insertAdjacentHTML('beforeend', HTML_REFERENCE)
  let warningParent = document.getElementById("identity")
  warningParent.insertAdjacentHTML('beforeend', HTML_WARNING_NAMETOOLONG)
  let nextnameParent = document.querySelector('tr[data-id="name"]')
  nextnameParent.insertAdjacentHTML('afterend', HTML_TABLE_NEXTNAMEPREVIEW)

  // toggle enabled/disabled
  let enableToggle = document.getElementById("morph-switch")
  enableToggle.addEventListener("input", (inputEvent) => {
    let enabled = inputEvent.target.checked
    STATE.enabled.set(enabled)
    if (enabled) {
      saveNormalName()
      updateGUI()
    } else {
      restoreNormalName()
    }
    toggleMorphnameControls(enabled)
  })

  // update localstorage when name template modified
  let nameTemplateInput = document.getElementById("morph-template")
  nameTemplateInput.addEventListener("focusout", (event) => {
    NAME_TEMPLATE.set(event.target.value)
    updateGUI()
  })

  // update localstorage when name current value modified
  let currentValueInput = document.getElementById("morph-current")
  currentValueInput.addEventListener("focusout", (event) => {
    MODES[STATE.currentMode.get()].setCurrent(event.target.value)
    updateGUI()
  })

  // update localstorage when name increment modified
  let incrementInput = document.getElementById("morph-increment")
  incrementInput.addEventListener("focusout", (event) => {
    MODES[STATE.currentMode.get()].setIncrement(event.target.value)
    updateGUI()
  })

  // reset button clears name
  let resetButton = document.getElementById("morph-reset")
  resetButton.addEventListener("click", () => {
    if (confirm("reset morphname to default values?")) {
      MODES[STATE.currentMode.get()].clear()
      NAME_TEMPLATE.clear()
      updateGUI()
    }
  })

  // button to manually generate the next name, without having to make a post
  let generateNextButton = document.createElement("button")
  generateNextButton.innerHTML = SVG_REFRESH
  generateNextButton.classList.add("morphname-button")
  generateNextButton.id = "morphname-generate-next"
  generateNextButton.title = "manually generate your next name"
  generateNextButton.addEventListener("click", () => {
    updateNextName()
    updateGUI()
    flashNameField()
  })
  let td = document.createElement("td")
  td.append(generateNextButton)
  document.getElementById("name").parentElement.parentElement.append(td)

  // change "name" to "current name"
  document.querySelector('label[for="name"]').innerText = "current name"

}


function toggleMorphnameControls(enabled) {
  /* toggle various controls when enabling/disabling the script */
  let morphnameControls = [
    document.getElementById("morphname-generate-next"),
    document.getElementById("morph-template"),
    document.getElementById("morph-current"),
    document.getElementById("morph-increment"),
    document.getElementById("morph-reset"),
  ]
  let vanillaControls = [
    document.getElementById("name")
  ]
  let dimmableControls = [
    document.querySelector("label[for='morph-preview']"),
    document.getElementById("morph-preview"),
    document.querySelector("label[for='morph-template']"),
    document.querySelector("label[for='morph-current']"),
    document.querySelector("label[for='morph-increment']"),
  ]
  let enabledCheckbox = document.getElementById("morph-switch")  // need to set when loading enabled state from storage
  let enabledLabel = document.querySelector("label[for='morph-switch']")

  if (enabled) {
    for (let control of morphnameControls) { control.disabled = false }
    for (let control of vanillaControls) { control.disabled = true }
    for (let control of dimmableControls) { control.style.opacity = "100%" }
    enabledCheckbox.checked = true
    enabledLabel.classList.add("giga-global-sig")  // /~ wowowow
  } else {
    for (let control of morphnameControls) { control.disabled = true }
    for (let control of vanillaControls) { control.disabled = false }
    for (let control of dimmableControls) { control.style.opacity = "20%" }
    enabledCheckbox.checked = false
    enabledLabel.classList.remove("giga-global-sig")
  }
}




/* tools */

function getStorage(key) { return localStorage.getItem(key) }
function setStorage(key, value) { localStorage.setItem(key, value) }
function clearStorage(key) { localStorage.removeItem(key) }

function announceScriptName() {
  /* hello */
  console.log(`%c[[ ${GM_info.script.name} v${GM_info.script.version} loaded ]]`, "color:lime; background:black;")
}

function modifiedStoreMine(id, op) {
  /* our modified version of storeMine... just pings name updater when we make a new post */
  if (STATE.enabled.get()) {
    updateNextName()
  }
  vanillaStoreMine(id, op)  // back to you in the studio
}

function getFloatingPrecision(float) {
  /* return the precision of float point number. zero if no decimal (int) */
  if (String(float).includes('.')) {
    return String(float).split('.').at(-1).length  // length of last item in array when split on decimal. this WILL go crazy with those funky decimals like 0.30000000000001
  } else {
    return 0  // stinky integer go home
  }
}

function strip(number, precision) {
  /* strip a float to decimal precision. keeps trailing zeros */
  return parseFloat(number).toFixed(precision)
}

if (!String.prototype.format) {
  /* add string formatting for name template - stolen from https://stackoverflow.com/a/4673436
     not strinctly necessary but i like being able to string format and you can't tell me what to do */
  String.prototype.format = function() {
    var args = arguments
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined' ? args[number] : match
    })
  }
}

function compatabilityUpgradeCheck() {
  /* check if user is rocking localstorage keys from an older version and bring them up to date with the hip new thang */
  let key_old_current = "morphnameNext"
  let key_old_increment = "morphnameIncrement"
  let value_old_current = getStorage("morphnameNext")
  let value_old_increment = getStorage("morphnameIncrement")
  if (value_old_current) {
    setStorage(KEY_INCREMENTING_CURRENT, value_old_current)
    clearStorage(key_old_current)
  }
  if (value_old_increment) {
    setStorage(KEY_INCREMENTING_DIFF, value_old_increment)
    clearStorage(key_old_increment)
  }
}




function main() {
  announceScriptName()
  addCSS()
  window.require.config(configState).storeMine = modifiedStoreMine  // replace vanilla with our version
  compatabilityUpgradeCheck()  // upgrade from previous versions

  // wait a tick so we don't compete with other board-specific additions to the identity panel (flags etc)
  setTimeout(() => {
    addMorphnameControls()
    toggleMorphnameControls(STATE.enabled.get())
    updateGUI()
  }, 2000)

  showChangelog()
}

main()
