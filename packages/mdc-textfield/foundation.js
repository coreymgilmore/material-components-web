/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import MDCFoundation from '@material/base/foundation';
import {MDCTextFieldAdapter} from './adapter';
import MDCTextFieldBottomLineFoundation from './bottom-line/foundation';
import MDCTextFieldInputFoundation from './input/foundation';
import {cssClasses, strings} from './constants';


/**
 * @extends {MDCFoundation<!MDCTextFieldAdapter>}
 * @final
 */
class MDCTextFieldFoundation extends MDCFoundation {
  /** @return enum {string} */
  static get cssClasses() {
    return cssClasses;
  }

  /** @return enum {string} */
  static get strings() {
    return strings;
  }

  /**
   * {@see MDCTextFieldAdapter} for typing information on parameters and return
   * types.
   * @return {!MDCTextFieldAdapter}
   */
  static get defaultAdapter() {
    return /** @type {!MDCTextFieldAdapter} */ ({
      addClass: () => {},
      removeClass: () => {},
      addClassToLabel: () => {},
      removeClassFromLabel: () => {},
      setIconAttr: () => {},
      eventTargetHasClass: () => {},
      registerTextFieldInteractionHandler: () => {},
      deregisterTextFieldInteractionHandler: () => {},
      notifyIconAction: () => {},
      addClassToHelperText: () => {},
      removeClassFromHelperText: () => {},
      helperTextHasClass: () => false,
      registerInputEventHandler: () => {},
      deregisterInputEventHandler: () => {},
      registerBottomLineEventHandler: () => {},
      deregisterBottomLineEventHandler: () => {},
      setHelperTextAttr: () => {},
      removeHelperTextAttr: () => {},
      getBottomLineFoundation: () => {},
      getInputFoundation: () => {},
    });
  }

  /**
   * @param {!MDCTextFieldAdapter=} adapter
   */
  constructor(adapter = /** @type {!MDCTextFieldAdapter} */ ({})) {
    super(Object.assign(MDCTextFieldFoundation.defaultAdapter, adapter));

    /** @private {boolean} */
    this.isFocused_ = false;
    /** @private {boolean} */
    this.useCustomValidityChecking_ = false;
    /** @private {function(): undefined} */
    this.inputFocusHandler_ = () => this.activateFocus();
    /** @private {function(): undefined} */
    this.inputBlurHandler_ = () => this.deactivateFocus();
    /** @private {function(!Event): undefined} */
    this.setPointerXOffset_ = (evt) => this.setBottomLineTransformOrigin(evt);
    /** @private {function(!Event): undefined} */
    this.textFieldInteractionHandler_ = (evt) => this.handleTextFieldInteraction(evt);
    /** @private {function(!Event): undefined} */
    this.bottomLineAnimationEndHandler_ = () => this.handleBottomLineAnimationEnd();
  }

  init() {
    this.adapter_.addClass(MDCTextFieldFoundation.cssClasses.UPGRADED);
    // Ensure label does not collide with any pre-filled value.
    if (this.adapter_.getInputFoundation().getValue()) {
      this.adapter_.addClassToLabel(MDCTextFieldFoundation.cssClasses.LABEL_FLOAT_ABOVE);
    }

    this.adapter_.registerInputEventHandler(
      MDCTextFieldInputFoundation.strings.FOCUS_EVENT, this.inputFocusHandler_);
    this.adapter_.registerInputEventHandler(
      MDCTextFieldInputFoundation.strings.BLUR_EVENT, this.inputBlurHandler_);
    this.adapter_.registerInputEventHandler(
      MDCTextFieldInputFoundation.strings.PRESSED_EVENT, this.setPointerXOffset_);
    ['click', 'keydown'].forEach((evtType) => {
      this.adapter_.registerTextFieldInteractionHandler(evtType, this.textFieldInteractionHandler_);
    });
    this.adapter_.registerBottomLineEventHandler(
      MDCTextFieldBottomLineFoundation.strings.ANIMATION_END_EVENT, this.bottomLineAnimationEndHandler_);
  }

  destroy() {
    this.adapter_.removeClass(MDCTextFieldFoundation.cssClasses.UPGRADED);
    this.adapter_.deregisterInputEventHandler(
      MDCTextFieldInputFoundation.strings.FOCUS_EVENT, this.inputFocusHandler_);
    this.adapter_.deregisterInputEventHandler(
      MDCTextFieldInputFoundation.strings.BLUR_EVENT, this.inputBlurHandler_);
    this.adapter_.deregisterInputEventHandler(
      MDCTextFieldInputFoundation.strings.PRESSED_EVENT, this.setPointerXOffset_);
    ['click', 'keydown'].forEach((evtType) => {
      this.adapter_.deregisterTextFieldInteractionHandler(evtType, this.textFieldInteractionHandler_);
    });
    this.adapter_.deregisterBottomLineEventHandler(
      MDCTextFieldBottomLineFoundation.strings.ANIMATION_END_EVENT, this.bottomLineAnimationEndHandler_);
  }

  /**
   * Handles all user interactions with the Text Field.
   * @param {!Event} evt
   */
  handleTextFieldInteraction(evt) {
    const input = this.adapter_.getInputFoundation();
    if (input.isDisabled()) {
      return;
    }

    input.setReceivedUserInput(true);

    const {target, type} = evt;
    const {TEXT_FIELD_ICON} = MDCTextFieldFoundation.cssClasses;
    const targetIsIcon = this.adapter_.eventTargetHasClass(target, TEXT_FIELD_ICON);
    const eventTriggersNotification = type === 'click' || evt.key === 'Enter' || evt.keyCode === 13;

    if (targetIsIcon && eventTriggersNotification) {
      this.adapter_.notifyIconAction();
    }
  }

  /**
   * Activates the text field focus state.
   */
  activateFocus() {
    const {FOCUSED, LABEL_FLOAT_ABOVE, LABEL_SHAKE} = MDCTextFieldFoundation.cssClasses;
    this.adapter_.addClass(FOCUSED);
    const bottomLine = this.adapter_.getBottomLineFoundation();
    if (bottomLine) {
      bottomLine.activate();
    }
    this.adapter_.addClassToLabel(LABEL_FLOAT_ABOVE);
    this.adapter_.removeClassFromLabel(LABEL_SHAKE);
    this.showHelperText_();
    this.isFocused_ = true;
  }

  /**
   * Sets the bottom line's transform origin, so that the bottom line activate
   * animation will animate out from the user's click location.
   * @param {!Event} evt
   */
  setBottomLineTransformOrigin(evt) {
    const bottomLine = this.adapter_.getBottomLineFoundation();
    if (bottomLine) {
      bottomLine.setTransformOrigin(evt);
    }
  }

  /**
   * Makes the helper text visible to screen readers.
   * @private
   */
  showHelperText_() {
    const {ARIA_HIDDEN} = MDCTextFieldFoundation.strings;
    this.adapter_.removeHelperTextAttr(ARIA_HIDDEN);
  }

  /**
   * Handles when bottom line animation ends, performing actions that must wait
   * for animations to finish.
   */
  handleBottomLineAnimationEnd() {
    const bottomLine = this.adapter_.getBottomLineFoundation();
    // We need to wait for the bottom line to be entirely transparent
    // before removing the class. If we do not, we see the line start to
    // scale down before disappearing
    if (!this.isFocused_ && bottomLine) {
      bottomLine.deactivate();
    }
  }

  /**
   * Deactives the Text Field's focus state.
   */
  deactivateFocus() {
    const {FOCUSED, LABEL_FLOAT_ABOVE, LABEL_SHAKE} = MDCTextFieldFoundation.cssClasses;
    const input = this.adapter_.getInputFoundation();

    this.isFocused_ = false;
    this.adapter_.removeClass(FOCUSED);
    this.adapter_.removeClassFromLabel(LABEL_SHAKE);

    if (!input.getValue() && !input.isBadInput()) {
      this.adapter_.removeClassFromLabel(LABEL_FLOAT_ABOVE);
    }

    if (!this.useCustomValidityChecking_) {
      this.changeValidity_(input.checkValidity());
    }
  }

  /**
   * Updates the Text Field's valid state based on the supplied validity.
   * @param {boolean} isValid
   * @private
   */
  changeValidity_(isValid) {
    const {INVALID, LABEL_SHAKE} = MDCTextFieldFoundation.cssClasses;
    if (isValid) {
      this.adapter_.removeClass(INVALID);
    } else {
      this.adapter_.addClassToLabel(LABEL_SHAKE);
      this.adapter_.addClass(INVALID);
    }
    this.updateHelperText_(isValid);
  }

  /**
   * Updates the state of the Text Field's helper text based on validity and
   * the Text Field's options.
   * @param {boolean} isValid
   */
  updateHelperText_(isValid) {
    const {HELPER_TEXT_PERSISTENT, HELPER_TEXT_VALIDATION_MSG} = MDCTextFieldFoundation.cssClasses;
    const {ROLE} = MDCTextFieldFoundation.strings;
    const helperTextIsPersistent = this.adapter_.helperTextHasClass(HELPER_TEXT_PERSISTENT);
    const helperTextIsValidationMsg = this.adapter_.helperTextHasClass(HELPER_TEXT_VALIDATION_MSG);
    const validationMsgNeedsDisplay = helperTextIsValidationMsg && !isValid;

    if (validationMsgNeedsDisplay) {
      this.adapter_.setHelperTextAttr(ROLE, 'alert');
    } else {
      this.adapter_.removeHelperTextAttr(ROLE);
    }

    if (helperTextIsPersistent || validationMsgNeedsDisplay) {
      return;
    }
    this.hideHelperText_();
  }

  /**
   * Hides the helper text from screen readers.
   * @private
   */
  hideHelperText_() {
    const {ARIA_HIDDEN} = MDCTextFieldFoundation.strings;
    this.adapter_.setHelperTextAttr(ARIA_HIDDEN, 'true');
  }

  /**
   * @return {boolean} True if the text field is disabled.
   */
  isDisabled() {
    return this.adapter_.getInputFoundation().isDisabled();
  }

  /**
   * @param {boolean} disabled Sets the text field disabled or enabled.
   */
  setDisabled(disabled) {
    const {DISABLED, INVALID} = MDCTextFieldFoundation.cssClasses;
    this.adapter_.getInputFoundation().setDisabled(disabled);
    if (disabled) {
      this.adapter_.addClass(DISABLED);
      this.adapter_.removeClass(INVALID);
      this.adapter_.setIconAttr('tabindex', '-1');
    } else {
      this.adapter_.removeClass(DISABLED);
      this.adapter_.setIconAttr('tabindex', '0');
    }
  }

  /**
   * @param {boolean} isValid Sets the validity state of the Text Field.
   */
  setValid(isValid) {
    this.useCustomValidityChecking_ = true;
    this.changeValidity_(isValid);
  }
}

export default MDCTextFieldFoundation;
