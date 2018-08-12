import { PolymerElement, html } from '@polymer/polymer';
import * as Gestures from '@polymer/polymer/lib/utils/gestures.js';

import '@polymer/app-layout/app-toolbar/app-toolbar.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@polymer/iron-pages/iron-pages.js';

import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';
import '@polymer/paper-tooltip/paper-tooltip.js';

import './editable-table.js';
import './loot-custom-icons.js';
import Plugin from '../js/plugin.js';

export default class LootPluginEditor extends PolymerElement {
  static get is() {
    return 'loot-plugin-editor';
  }

  static get properties() {
    return {
      selected: {
        type: String,
        value: 'main'
      }
    };
  }

  static get template() {
    return html`
      <style>
        :host {
          position: relative;
          @apply --shadow-elevation-2dp;
          height: 264px;
          min-height: 56px;
          max-height: calc(100% - 56px);
          transition: height var(--state-transition-time), min-height var(--state-transition-time);
          background-color: var(--primary-background-color);
        }
        :host(.hidden) {
          height: 0;
          min-height: 0;
        }
        :host(.resizing) {
          transition: unset;
        }

        /* Material Design for non-button icons. */
        iron-icon {
          color: var(--secondary-text-color);
          padding: 8px;
        }

        /* Icon styling. */
        [hidden] {
          display: none;
        }
        #accept {
          color: var(--dark-accent-color);
        }
        #cancel {
          color: red;
        }

        /* Content styling. */
        ::slotted(h1) {
          margin: 0;
          font-size: 1.143rem;
        }

        /* Editor input styling. */
        #main > div {
          height: 48px;
          @apply --layout-horizontal;
          @apply --layout-center;
        }
        #main > div > div:first-child {
          margin-right: 16px;
          @apply --layout-flex;
        }
        iron-pages {
          /* Should be 104px, but that causes scroll bars to appear, probably a
            rounding error. */
          height: calc(100% - 103px);
          overflow: auto;
        }
        iron-pages > *:not(.iron-selected) {
          display: none;
        }

        /* Misc Styling. */
        app-toolbar {
          background: var(--loot-plugin-editor-toolbar-background, var(--light-primary-color));
          color: var(--primary-text-color);
          height: 104px;
        }
        header[top-item] {
          @apply --layout-horizontal;
          padding: 8px 16px;
          align-items: center;
        }
        #main {
          padding: 8px 16px;
        }
        #title {
          @apply --layout-flex;
          overflow: hidden;
          white-space: nowrap;
        }
        #splitter {
          width: 100%;
          height: 10px;
          position: absolute;
          top: -5px;
          cursor: row-resize;
          z-index: 1;
        }
        #splitter:active {
          background: var(--divider-color);
        }
        editable-table paper-icon-button {
          color: var(--secondary-text-color);
        }
        editable-table paper-icon-button[disabled] {
            color: var(--disabled-text-color);
        }
        editable-table paper-icon-button[icon=delete]:hover {
            color: red;
        }
        editable-table paper-icon-button[icon=add]:hover {
            color: green;
        }
      </style>
      <div id="splitter"></div>
      <app-toolbar>
        <header top-item>
          <div id="title">
            <slot name="title"></slot>
          </div>
          <paper-icon-button id="accept" icon="save"></paper-icon-button>
          <paper-tooltip for="accept">Save Metadata</paper-tooltip>
          <paper-icon-button id="cancel" icon="close"></paper-icon-button>
          <paper-tooltip for="cancel">Cancel</paper-tooltip>
        </header>
        <paper-tabs id="tableTabs" selected="{{selected}}" attr-for-selected="data-for" scrollable bottom-item>
          <paper-tab data-for="main">Main</paper-tab>
          <paper-tab data-for="after">Load After</paper-tab>
          <paper-tab data-for="req">Requirements</paper-tab>
          <paper-tab data-for="inc">Incompatibilities</paper-tab>
          <paper-tab data-for="message">Messages</paper-tab>
          <paper-tab data-for="tags">Bash Tags</paper-tab>
          <paper-tab data-for="dirty">Dirty Plugin Info</paper-tab>
          <paper-tab data-for="clean">Clean Plugin Info</paper-tab>
          <paper-tab data-for="url">Locations</paper-tab>
        </paper-tabs>
      </app-toolbar>
      <iron-pages id="tablePages" selected="{{selected}}" attr-for-selected="data-page">
        <div id="main" data-page="main">
          <div>
            <div>Enable Edits</div>
            <paper-toggle-button id="enableEdits"></paper-toggle-button>
          </div>
          <div>
            <div>Group</div>
            <loot-dropdown-menu id="group" no-label-float>
              <!-- Group <paper-item> elements go here. -->
            </loot-dropdown-menu>
          </div>
        </div>
        <slot name="after"></slot>
        <slot name="req"></slot>
        <slot name="inc"></slot>
        <slot name="message"></slot>
        <slot name="tags"></slot>
        <slot name="dirty"></slot>
        <slot name="clean"></slot>
        <slot name="url"></slot>
      </iron-pages>`;
  }

  connectedCallback() {
    super.connectedCallback();
    this.$.accept.addEventListener('click', LootPluginEditor._onHideEditor);
    this.$.cancel.addEventListener('click', LootPluginEditor._onHideEditor);
    this.$.splitter.addEventListener(
      'mousedown',
      LootPluginEditor._stopPropagation
    );
    Gestures.addListener(this.$.splitter, 'track', this._onSplitterDrag);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.$.accept.removeEventListener('click', LootPluginEditor._onHideEditor);
    this.$.cancel.removeEventListener('click', LootPluginEditor._onHideEditor);
    this.$.splitter.removeEventListener(
      'mousedown',
      LootPluginEditor._stopPropagation
    );
    Gestures.removeListener(this.$.splitter, 'track', this._onSplitterDrag);
  }

  static _stopPropagation(evt) {
    evt.preventDefault();
    evt.stopPropagation();
  }

  _onSplitterDrag(evt) {
    if (evt.detail.state === 'start') {
      this.parentNode.host.classList.toggle('resizing', true);
      this.parentNode.host.style.height = `${parseInt(
        window.getComputedStyle(this.parentNode.host).height,
        10
      )}px`;
    } else if (evt.detail.state === 'end') {
      this.parentNode.host.classList.toggle('resizing', false);
    }
    window.getSelection().removeAllRanges();
    this.parentNode.host.style.height = `${parseInt(
      this.parentNode.host.style.height,
      10
    ) - evt.detail.ddy}px`;
    evt.preventDefault();
    evt.stopPropagation();
  }

  static _rowDataToCrc(rowData) {
    return {
      crc: parseInt(rowData.crc, 16),
      itm: parseInt(rowData.itm, 10),
      udr: parseInt(rowData.udr, 10),
      nav: parseInt(rowData.nav, 10),
      util: rowData.utility
    };
  }

  readFromEditor() {
    /* Need to turn all the editor controls' values into data to
        process. Determining whether or not the group has changed
        is left to the C++ side of things, and masterlist rows in
        the tables can be ignored because they're immutable. */

    const metadata = {
      name: this.querySelector('h1').textContent,
      enabled: this.$.enableEdits.checked,
      group: this.$.group.value
    };

    const tables = this.querySelectorAll('editable-table');
    for (let j = 0; j < tables.length; j += 1) {
      const rowsData = tables[j].getRowsData(true);
      const tableType = tables[j].parentElement.getAttribute('data-page');
      if (rowsData.length > 0) {
        if (tableType === 'after') {
          metadata.after = rowsData;
        } else if (tableType === 'req') {
          metadata.req = rowsData;
        } else if (tableType === 'inc') {
          metadata.inc = rowsData;
        } else if (tableType === 'message') {
          metadata.msg = rowsData;
        } else if (tableType === 'tags') {
          metadata.tag = rowsData.map(Plugin.tagFromRowData);
        } else if (tableType === 'dirty') {
          metadata.dirty = rowsData.map(LootPluginEditor._rowDataToCrc);
        } else if (tableType === 'clean') {
          metadata.clean = rowsData.map(LootPluginEditor._rowDataToCrc);
        } else if (tableType === 'url') {
          metadata.url = rowsData;
        }
      }
    }

    return metadata;
  }

  static _onHideEditor(evt) {
    /* First validate table inputs. */
    let isValid = true;
    const inputs = evt.target.parentElement.parentElement.parentNode.host.querySelectorAll(
      'editable-table'
    );
    for (let i = 0; i < inputs.length; i += 1) {
      if (!inputs[i].validate()) {
        isValid = false;
      }
    }

    if (isValid || evt.target.id !== 'accept') {
      /* Now hide editor. */
      const editor = evt.target.parentElement.parentElement.parentNode.host;
      editor.style.height = '';
      editor.classList.toggle('hidden', true);

      /* Fire the close event, saying whether or not to save data. */
      evt.target.dispatchEvent(
        new CustomEvent('loot-editor-close', {
          detail: evt.target.id === 'accept',
          bubbles: true,
          composed: true
        })
      );
    }
  }

  static _dirtyInfoToRowData(dirtyInfo) {
    return {
      crc: dirtyInfo.crc.toString(16).toUpperCase(),
      itm: dirtyInfo.itm,
      udr: dirtyInfo.udr,
      nav: dirtyInfo.nav,
      utility: dirtyInfo.util
    };
  }

  setEditorData(newData) {
    /* newData is a Plugin object reference. */
    this.querySelector('h1').textContent = newData.name;

    /* Fill in the editor input values. */
    if (newData.userlist && !newData.userlist.enabled) {
      this.$.enableEdits.checked = false;
    } else {
      this.$.enableEdits.checked = true;
    }
    this.$.group.value = newData.group;

    /* Clear then fill in editor table data. Masterlist-originated
        rows should have their contents made read-only. */
    const tables = this.querySelectorAll('editable-table');
    for (let j = 0; j < tables.length; j += 1) {
      tables[j].clear();
      const tableType = tables[j].parentElement.getAttribute('data-page');
      if (tableType === 'message') {
        if (newData.masterlist && newData.masterlist.msg) {
          newData.masterlist.msg.forEach(tables[j].addReadOnlyRow, tables[j]);
        }
        if (newData.userlist && newData.userlist.msg) {
          newData.userlist.msg.forEach(tables[j].addRow, tables[j]);
        }
      } else if (tableType === 'tags') {
        if (newData.masterlist && newData.masterlist.tag) {
          newData.masterlist.tag
            .map(Plugin.tagToRowData)
            .forEach(tables[j].addReadOnlyRow, tables[j]);
        }
        if (newData.userlist && newData.userlist.tag) {
          newData.userlist.tag
            .map(Plugin.tagToRowData)
            .forEach(tables[j].addRow, tables[j]);
        }
      } else if (tableType === 'dirty') {
        if (newData.masterlist && newData.masterlist.dirty) {
          newData.masterlist.dirty
            .map(LootPluginEditor._dirtyInfoToRowData)
            .forEach(tables[j].addReadOnlyRow, tables[j]);
        }
        if (newData.userlist && newData.userlist.dirty) {
          newData.userlist.dirty
            .map(LootPluginEditor._dirtyInfoToRowData)
            .forEach(tables[j].addRow, tables[j]);
        }
      } else if (tableType === 'clean') {
        if (newData.masterlist && newData.masterlist.clean) {
          newData.masterlist.clean
            .map(LootPluginEditor._dirtyInfoToRowData)
            .forEach(tables[j].addReadOnlyRow, tables[j]);
        }
        if (newData.userlist && newData.userlist.clean) {
          newData.userlist.clean
            .map(LootPluginEditor._dirtyInfoToRowData)
            .forEach(tables[j].addRow, tables[j]);
        }
      } else {
        if (newData.masterlist && newData.masterlist[tableType]) {
          newData.masterlist[tableType].forEach(
            tables[j].addReadOnlyRow,
            tables[j]
          );
        }
        if (newData.userlist && newData.userlist[tableType]) {
          newData.userlist[tableType].forEach(tables[j].addRow, tables[j]);
        }
      }
    }

    /* Now show editor. */
    this.classList.toggle('hidden', false);
  }
}

customElements.define(LootPluginEditor.is, LootPluginEditor);
