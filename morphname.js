// ==UserScript==
// @name         libpol morphname
// @version      0.9
// @description  automagically change name
// @author       github.com/Xx-hackerman-xX
// @match        *://*.libpol.org/*
// @match        *://*.brainworm.surgery/*
// @match        *://*.brainworm.rodeo/*
// @icon         https://libpol.org/gen/UOGMCAQwI6cr.jpg
// @grant        none
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/Xx-hackerman-xX/morphname/refs/heads/main/morphname.js
// ==/UserScript==


/*

  todo

  - a way to manually edit the localstorage value without directly jumping into localstorage?
    - field in the identity tab
    - textbox with button
    - push whatever is in textbox to storage and pray

  - better storage in general, it's kinda weird atm but it works so #shrug

*/


/* ENTERING FRIENDLY CONFIG ZONE */




const STARTING_VALUE = 0.0  // initial value from which to start the incrementing number for the first time
const DIFF_INCREMENTING_FLOAT = 0.001  // how much to increment each time
const namestringTemplate = "{0}% anon"  // username template. {0} is replaced with the magic incrementing number




/* EXITING FRIENDLY CONFIG ZONE */

// add string formatting - stolen from https://stackoverflow.com/a/4673436
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

// localstorage keys
const KEY_INCREMENTING_FLOAT_VALUE = 'morphnameNext'
const KEY_INCREMENTING_FLOAT_DIFF = 'morphnameIncrement'

// get precision so we can cut off weird js float rounding errors
const DIFF_INCREMENTING_FLOAT_PRECISION = String(DIFF_INCREMENTING_FLOAT).split('.')[String(DIFF_INCREMENTING_FLOAT).split('.').length-1].length

// const defaultValues = {
//   next: 1.69,
//   increment: 0.001,
//   nameTemplate: "{0}% anon"
// }

var configState = "state"
var configIdentity = "posts/posting/identity"

try {  // find the right window.requre.config namepsace
  window.require.config(configState)
} catch {  // we're on a page that requires config/ to be prepended for whatever reason
  configState = "client/" + configState
  configIdentity = "client/" + configIdentity
}

const vanillaStoreMine = window.require.config(configState).storeMine  // for later

function announceScriptName() {
  // hello
  console.log(`%c[[ ${GM_info.script.name} v${GM_info.script.version} loaded ]]`, "color:lime; background:black;")
}
function getStorage(key) {
  // get localstorage key
	return JSON.parse(localStorage.getItem(key))
}
function setStorage(key, value) {
  // set localstorage key to value
	localStorage.setItem(key, JSON.stringify(value))
}

function getIncrementingFloat() {
  // get magic number
  let value = getStorage(KEY_INCREMENTING_FLOAT_VALUE)
  if (!value) {
    value = STARTING_VALUE
  }
  return Number(value)
}

function setIncrementingFloat(value) {
  // set magic number
  setStorage(KEY_INCREMENTING_FLOAT_VALUE, Number(value))
}

function setName(name) {
  // set a new name as if user typed it themselves
  window.require.config(configIdentity).default.name = name;
  window.require.config(configIdentity).initIdentity();
  localStorage.setItem('name', name);
}

function updateName() {
  // increment our number and save it
  let value = getIncrementingFloat()
  value += DIFF_INCREMENTING_FLOAT
  setIncrementingFloat(value)  // save to localstorage
  value = value.toFixed(DIFF_INCREMENTING_FLOAT_PRECISION)  // chop off rounding errors
  setName(namestringTemplate.format(value))
}

function displayName() {
  // get up-to-date name, for when we load into page for first time
  let value = getIncrementingFloat()
  value = value.toFixed(DIFF_INCREMENTING_FLOAT_PRECISION)  // chop off rounding errors
  setName(namestringTemplate.format(value))
}

// let tableData = `
// <tr data-id="morph-switch">
// 	<td><label for="morph-switch" title="Enable morphname, and disable manual name editing">enable morphname</label></td>
// 	<td><input name="morph-switch" id="morph-switch" title="Enable morphname, and disable manual name editing" type="checkbox"></td>
// </tr>

// <tr>
// 	<td><label for="morph-next" title="Next number for {0}">next</label></td>
// 	<td><input name="morph-next" id="morph-next" type="text" maxlength="5" title="Next number for {0}"><td>
// 	<td><label for="morph-increment" title="How much the number {0} will increment by after each post">increment</label></td>
// 	<td><input name="morph-increment" id="morph-increment" type="text" maxlength="5" title="How much the number {0} will increment by after each post"><td>
// </tr>

// <tr data-id="morph-template">
// 	<td><label for="morph-template" title="The string {0} will be replaced by your number above">name template</label></td>
// 	<td><input name="morph-template" id="morph-template" type="text" maxlength="40" title="The string {0} will be replaced by your number above"><td>
// </tr>


// <tr data-id="morph-reset">
// 	<input id="morph-reset" type="submit" value="reset morphname" title="Reset to default values">
// </tr>
// `

// function addMorphnameControls() {
//   let parent = document.querySelector("#identity > table:nth-child(1) > tbody:nth-child(1)")  // inner table of identity panel
//   parent.insertAdjacentHTML('beforeend', tableData)
// }

// function setDefaultValues() {
//   document.getElementById("morph-next").value = defaultValues.next
//   document.getElementById("morph-increment").value = defaultValues.increment
//   document.getElementById("morph-template").value = defaultValues.nameTemplate
// }

function addResetButton() {
  let parent = document.getElementById("identity")  // identity panel
  let button = document.createElement("button")
  button.innerText = "[reset magic number]"
  button.addEventListener("click", () => {
    if (confirm("really reset your number? make sure to change it to what you want in the code first. the page will reload automatically.")) {
      localStorage.removeItem(KEY_INCREMENTING_FLOAT_VALUE)
      location.reload()
    }
  })
  parent.append(button)
}

function modifiedStoreMine(id, op) {
  // our modified version of storeMine that just pings the name update code when we make a new post
  updateName()
  vanillaStoreMine(id, op)  // back to you in the studio
}

function main() {
  announceScriptName()
  window.require.config(configState).storeMine = modifiedStoreMine  // replace vanilla with our version
  // addMorphnameControls()
  addResetButton()
  displayName()

  setTimeout(setDefaultValues, 1000)  // idk why but if we try and do this immediately, all values will be "undefined". race condition with the vanilla js or something idk

}

main()
