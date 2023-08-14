import '@styles/h5peditor-active-reader-chapter.scss';

/** Class for Active Reader Chapter editor */
export default class ActiveReaderChapter {

  /**
   * @class
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    this.parent = parent;
    this.field = field;
    this.params = params;
    this.setValue = setValue;

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // DOM
    this.$container = H5P.jQuery('<div>', {
      class: 'h5peditor-active-reader-chapter'
    });

    // Instantiate original field (or create your own and call setValue)
    this.fieldInstance = new H5PEditor.widgets[this.field.type](this.parent, this.field, this.params, this.setValue);
    this.fieldInstance.appendTo(this.$container);

    this.initializeContentList();

    // Relay changes
    if (this.fieldInstance.changes) {
      this.fieldInstance.changes.push(() => {
        this.handleFieldChange();
      });
    }

    // Errors
    this.$errors = this.$container.find('.h5p-errors');

    this.parent.ready(() => {
      this.passReadies = false;
    });
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    $wrapper.get(0).append(this.$container.get(0));
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @returns {boolean} True, if current value is valid, else false.
   */
  validate() {
    return this.fieldInstance.validate();
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.get(0).remove();
  }

  /**
   * Handle change of field.
   */
  handleFieldChange() {
    this.params = this.fieldInstance.params;
    this.changes.forEach((change) => {
      change(this.params);
    });
  }

  /**
   * Initialize list of contents with extra functionality.
   */
  initializeContentList() {
    this.contentList = this.fieldInstance.children[0];

    const contentListIndex = this.fieldInstance.field?.fields
      ?.findIndex((field) => field.name === 'content');

    this.contentList = this.fieldInstance.children[contentListIndex];

    if (!this.contentList) {
      return;
    }

    this.fieldInstance.on('expanded', () => {
      if (this.wasChapterGroupOpened) {
        return; // Group might have been collapsed and expanded again
      }

      this.wasChapterGroupOpened = true;
      this.initializeOnlyOneContentOpenAtATime();
    });
  }

  /**
   * Prepare list to only allow one content items open at a time.
   */
  initializeOnlyOneContentOpenAtATime() {
    // List widget doesn't offer direct way to access children/their number
    let groupToKeepOpen = null;

    // Handle existing items
    this.contentList.forEachChild((child, index) => {
      this.overrideContentGroup(child);
      if (index === 0) {
        groupToKeepOpen = child;
      }
    });
    this.collapseContents({ excluded: groupToKeepOpen });

    // Handle items added later on
    this.contentList.on('addedItem', (event) => {
      const newChild = event.data;
      this.overrideContentGroup(newChild);
      this.collapseContents({ excluded: newChild });
    });
  }

  /**
   * Override content group.
   * @param {H5PEditor.Group} group Group instance.
   */
  overrideContentGroup(group) {
    // Collapsing should ignore field validity, use simplified collapse function
    group.collapse = () => {
      group.$title.get(0).setAttribute('aria-expanded', 'false');
      group.trigger('collapsed');
      group.$group.get(0).classList.remove('expanded');
    };

    group.on('expanded', () => {
      this.collapseContents({ excluded: group });
    });
  }

  /**
   * Collapse contents.
   * @param {object} [params] Parameters.
   * @param {H5PEditor.Group[]} [params.excluded] Contents to exclude from collapsing.
   */
  collapseContents({ excluded = [] }) {
    if (!Array.isArray(excluded)) {
      excluded = [excluded];
    }

    this.contentList.forEachChild((child) => {
      if (excluded.includes(child)) {
        return;
      }

      child.collapse();
    });
  }
}
