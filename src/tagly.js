import { configItems } from "./constants"

export default class extends EventTarget {
    constructor(element, config = {}) {
        super()

        this._values = []
        this._autocompleteItems = []
        this._autocompleteReady = true
        this._error = ''
        this._liveInputValue = ''

        this._validateElement(element)
        this._validateConfig(config)
        this._initConfig(config)
        this._createElements()
        this._setInitValue()
        this._configureListener()
    }

    _validateElement(element) {
        // ensure the element passed in parameter
        if (!element) {
            throw new Error('Tagly initialization requires at least one parameter as input element tag')
        }
        // ensure the element has an id
        if (!element.hasAttribute('id') || element.id == '') {
            throw new Error('Tagly element must have an id')
        }

        // bind to tagly
        this._element = element
        this._id = this._element.id
    }

    _validateConfig(config) {
        // ensure the config object contains only valid config item
        Object.entries(config).forEach(([item, value]) => {
            if (configItems.map(c => c.item).includes(item) == false) {

                throw new Error(item + ': is not a valid Tagly config item')
            }
            const selectedConfig = configItems.filter(cf => cf.item == item)[0]
            if (selectedConfig.validate(value) == false) {

                throw new Error(item + ': only accepts ' + selectedConfig.type)
            }
        })
    }

    _initConfig(config) {
        if (config.clearDefaultStyles == undefined) {
            config.clearDefaultStyles = false
        }
        if (config.displayError == undefined) {
            config.displayError = true
        }
        if (config.itemCase == undefined) {
            config.itemCase = 'capitalize'
        }
        if (config.sendAsJSON == undefined) {
            config.sendAsJSON = false
        }
        if (config.showAutocomplete == undefined) {
            config.showAutocomplete = false
        }
        if (config.autocompleteItems != undefined) {
            this._autocompleteItems = config.autocompleteItems
        }
        this._config = config
    }

    _createElements() {
        // create wrapper
        const wrapper = document.createElement('div')
        this._setWrapperStyle(wrapper)
        this._setWrapperClass(wrapper)
        wrapper.setAttribute('id', this._id + '__wrapper')

        // create error message
        const errorMessage = document.createElement('div')
        errorMessage.setAttribute('id', this._id + '__error-message')

        // create value preview
        const preview = document.createElement('span')
        this._setPreviewStyle(preview)
        this._setPreviewClass(preview)
        preview.setAttribute('id', this._id + '__preview')

        // create input area
        const input = document.createElement('input')
        this._setInputStyle(input)
        this._setInputClass(input)
        input.setAttribute('id', this._id + '__input')
        if (this._config.placeholder != undefined) {
            input.placeholder = this._config.placeholder
        } else {
            input.placeholder = 'Type then enter..'
        }

        // create hidden input to store tag value
        const hiddenInput = document.createElement('input')
        hiddenInput.setAttribute('id', this._id + '__value')
        hiddenInput.setAttribute('type', 'hidden')
        if (this._config.name != undefined && this._config.name != '') {
            hiddenInput.setAttribute('name', this._config.name)
        } else {
            hiddenInput.setAttribute('name', this._id + '__value')
        }

        // create autocomplete wrapper
        const autocompleteWrapper = document.createElement('div')
        autocompleteWrapper.setAttribute('id', this._id + '__autocomplete-wrapper')

        // create autocomplete container
        const autocompleteContainer = document.createElement('div')
        autocompleteContainer.setAttribute('id', this._id + '__autocomplete-container')

        // add all elements to class instance
        this._wrapper = wrapper
        this._errorMessage = errorMessage
        this._preview = preview
        this._input = input
        this._hiddenInput = hiddenInput
        this._autocompleteWrapper = autocompleteWrapper
        this._autocompleteContainer = autocompleteContainer

        // append all elements to tag input element
        this._element.append(this._errorMessage)
        this._element.append(this._wrapper)
        if (this._config.autocomplete) {
            this._element.append(this._autocompleteWrapper)
            this._autocompleteWrapper.append(this._autocompleteContainer)
        }
        this._wrapper.append(this._preview)
        this._wrapper.append(this._input)
        this._wrapper.append(this._hiddenInput)
    }

    _setInitValue() {
        if (this._config.value != undefined) {
            this._setValues(this._sanitizeRawValue(this._config.value))
        } else {
            if (this._element.hasAttribute('data-value')) {
                const dataValue = this._element.getAttribute('data-value')
                this._setValues(this._sanitizeRawValue(dataValue))
            }
        }
    }

    _configureListener() {
        this._element.addEventListener('click', evt => {
            this._input.focus()
        })

        this._input.addEventListener('keydown', evt => {
            if (evt.key == 'Backspace') {
                if (evt.target.value == '') {
                    if (this._values.length > 0) {
                        let valueToDelete = this._values[this._values.length - 1]
                        this._removeValue(valueToDelete.id)
                    }
                }
            }
            this._clearError()
        })

        this._input.addEventListener('keypress', evt => {
            if (evt.key == 'Enter' || evt.key == ',') {
                evt.preventDefault()
                let tag = this._sanitizeTag(evt.target.value)
                if (tag != '') {
                    this._addValue(this._createValueObject(tag))
                }
                evt.target.value = ''
                this._resetAutocomplete()
            }
        })

        this._input.addEventListener('paste', evt => {
            evt.preventDefault()
            let values = this._sanitizeRawValue(evt.clipboardData.getData('Text'))
            this._addMultiple(values)
            this._triggerEvent('paste', values)
            this._resetAutocomplete()
        })

        this._input.addEventListener('input', evt => {
            this._liveInputValue = evt.target.value
            this._triggerEvent('input', evt.target.value)
            if (this._config.autocomplete) {
                this._triggerEvent('before-autocomplete', evt.target.value)
                if (this._autocompleteReady) {
                    this._showAutocomplete(evt.target.value)
                }
            }
        })
    }

    _createValueObject(tag) {
        return {
            id: this._uniqueId(),
            tag: tag
        }
    }

    _setError(message) {
        if (this._config.displayError) {
            let error = document.createElement('span')
            error.textContent = message
            this._setErrorStyle(error)
            this._setErrorClass(error)
            this._errorMessage.append(error)
        }
        this._triggerEvent('error', message)
    }

    _clearError() {
        this._errorMessage.innerHTML = ''
    }

    _setValues(values) {
        this._values = values
        this._updatePreview()
        this._updateHiddenInputValue()
    }

    _addFromRaw(rawValue) {
        let values = this._sanitizeRawValue(rawValue)
        this._addMultiple(values)
    }

    _addValue(value) {
        if (this._isNotDuplicate(value)) {
            this._values.push(value)
            this._updatePreview()
            this._updateHiddenInputValue()
            this._triggerEvent('added', value)
            this._triggerEvent('changed', this._values)
        }

    }

    _addMultiple(values) {
        values.forEach(value => {
            if (this._isNotDuplicate(value)) {
                this._values.push(value)
            }
        })
        this._updatePreview()
        this._updateHiddenInputValue()
        this._triggerEvent('changed', this._values)
    }

    _isNotDuplicate(value) {
        if (this._values.filter(v => {
            return v.tag == value.tag
        }).length < 1) {
            return true
        }
        this._triggerEvent('duplicate', value)
        return false
    }

    _removeValue(valueId) {
        const valueToRemove = this._values.filter(value => {
            return value.id === valueId
        })[0]

        this._values = this._values.filter(value => {
            return value.id !== valueId
        })
        this._updatePreview()
        this._updateHiddenInputValue()
        this._triggerEvent('removed', valueToRemove)
        this._triggerEvent('changed', this._values)
    }

    _updatePreview() {
        this._preview.innerHTML = ''
        this._values.forEach(value => {
            let itemId = value.id
            let itemTag = value.tag
            let itemText = value.tag
            let previewItem = this._createPreviewItem(itemId, itemTag, itemText)
            this._preview.append(previewItem)
        });
    }

    _updateHiddenInputValue() {
        if (this._config.sendAsJSON) {
            this._hiddenInput.value = JSON.stringify(this._values)
        } else {
            this._hiddenInput.value = this._values.map(value => {
                return value.tag
            }).join(',')
        }
    }

    _sanitizeRawValue(rawValue) {
        let values = []
        rawValue.split(',').forEach(value => {
            value = this._sanitizeTag(value)
            if (value != '') {
                const tag = value
                if (values.filter(v => {
                    return v.tag == tag
                }).length < 1) {
                    values.push(this._createValueObject(tag))
                }
            }
        })

        return values
    }

    _sanitizeTag(tag, withValidation = true) {
        tag = tag.trim()
        if (this._config.itemCase == 'capitalize') {
            tag = tag.replace(/(^\w|\s\w)/g, m => m.toUpperCase())
        } else if (this._config.itemCase == 'uppercase') {
            tag = tag.toUpperCase()
        } else if (this._config.itemCase == 'lowercase') {
            tag = tag.toLowerCase()
        } else {
            tag = tag.replace(/(^\w|\s\w)/g, m => m.toUpperCase())
        }
        if (withValidation) {
            if (this._isValidTag(tag) == false) {
                tag = ''
            }
        }
        return tag
    }

    _isValidTag(tag) {
        if (this._config.tagValidation != undefined) {
            const validation = this._config.tagValidation(tag)
            this._validateTagValidationReturnValue(validation)
            return validation
        }
        this._clearError()
        return true
    }

    _validateTagValidationReturnValue(returnValue) {
        if (Object.prototype.toString.call(returnValue) != '[object Boolean]') {
            throw new Error('The validation must return true or false according to your validation results.')
        }
    }

    _createPreviewItem(id, tag, text) {
        let deleteItemButton = document.createElement('button')
        deleteItemButton.tabIndex = '-1'
        deleteItemButton.innerHTML = '&#10007;'
        if (
            this._config.deleteItemButtonInnerHTML != undefined &&
            this._config.deleteItemButtonInnerHTML != '') {
            deleteItemButton.innerHTML = this._config.deleteItemButtonInnerHTML
        }
        this._setDeleteItemButtonStyle(deleteItemButton)
        this._setDeleteItemButtonClass(deleteItemButton)

        deleteItemButton.addEventListener('click', (evt) => {
            this._removeValue(evt.target.parentElement.id)
        })

        let previewItem = document.createElement('span')
        this._setPreviewItemStyle(previewItem)
        this._setPreviewItemClass(previewItem)

        previewItem.setAttribute('id', id)
        previewItem.setAttribute('data-tag', tag)
        previewItem.append(deleteItemButton)
        previewItem.append(text)

        return previewItem
    }

    _uniqueId() {
        return Math.random().toString(36).replace('.', '')
    }

    _triggerEvent(name, detail) {
        switch (name) {
            case 'changed':
                const onChanged = new CustomEvent('changed', {
                    detail: detail
                })
                this.dispatchEvent(onChanged)
                break
            case 'added':
                const onAdded = new CustomEvent('added', {
                    detail: detail
                })
                this.dispatchEvent(onAdded)
                break
            case 'removed':
                const onRemoved = new CustomEvent('removed', {
                    detail: detail
                })
                this.dispatchEvent(onRemoved)
                break
            case 'error':
                const onError = new CustomEvent('error', {
                    detail: detail
                })
                this.dispatchEvent(onError)
                break
            case 'paste':
                const onPaste = new CustomEvent('paste', {
                    detail: detail
                })
                this.dispatchEvent(onPaste)
                break
            case 'duplicate':
                const onDuplicate = new CustomEvent('duplicate', {
                    detail: detail
                })
                this.dispatchEvent(onDuplicate)
                break
            case 'input':
                const onInput = new CustomEvent('input', {
                    detail: detail
                })
                this.dispatchEvent(onInput)
                break
            case 'before-autocomplete':
                const onBeforeAutocomplete = new CustomEvent('before-autocomplete', {
                    detail: detail
                })
                this.dispatchEvent(onBeforeAutocomplete)
                break
            default:
                break
        }
    }

    _resetAutocomplete() {
        if (this._config.autocomplete == false) return

        this._autocompleteWrapper.removeAttribute('style')
        this._autocompleteWrapper.removeAttribute('class')
        this._autocompleteWrapper.querySelector(`#${this._id}__autocomplete-container`).removeAttribute('style')
        this._autocompleteWrapper.querySelector(`#${this._id}__autocomplete-container`).removeAttribute('class')
        this._autocompleteWrapper.querySelector(`#${this._id}__autocomplete-container`).innerHTML = ''
    }

    _showAutocomplete(inputValue) {
        this._resetAutocomplete()
        const wrapper = this._autocompleteWrapper
        const container = this._autocompleteContainer
        const items = this._autocompleteItems

        if (!inputValue) return false

        for (let i = 0; i < items.length; i++) {
            const search = this._regexSearch(items[i], inputValue)
            if (search != '') {
                this._setAutocompleteContainerStyle(container)
                this._setAutocompleteContainerClass(container)
                this._setAutocompleteWrapperStyle(wrapper)
                this._setAutocompleteWrapperClass(wrapper)
                const autocompleteItem = document.createElement('span')
                this._setAutocompleteItemStyle(autocompleteItem)
                this._setAutocompleteItemClass(autocompleteItem)
                autocompleteItem.setAttribute('data-value', items[i])
                autocompleteItem.setAttribute('role', 'button')
                autocompleteItem.innerHTML = search
                autocompleteItem.addEventListener('click', evt => {
                    const selected = autocompleteItem.getAttribute('data-value')
                    const tag = this._sanitizeTag(selected)
                    if (tag != '') {
                        this._addValue(this._createValueObject(tag))
                    }
                    this._resetAutocomplete()
                    this._input.value = ''
                })

                let valueArray = this._values.map(value => {
                    return value.tag
                })

                if (valueArray.includes(this._sanitizeTag(autocompleteItem.getAttribute('data-value'), false)) == false) {
                    container.appendChild(autocompleteItem)
                }
            }
        }
    }

    _regexSearch(string, search) {
        try {
            const reg = new RegExp(search, 'i')
            const match = string.match(reg)
            if (match == null) return ''
            const matchedText = match[0]
            const index = match.index
            const input = match.input
            const left = input.substr(0, index)
            const center = '<strong>' + matchedText + '</strong>'
            const right = input.substr(index + matchedText.length)
            return left + center + right
        } catch (error) {
            return ''
        }
    }

    /**
     * Functions to add style and class to the elements
     */
    _setWrapperStyle(wrapper) {
        if (this._config.clearDefaultStyles == false) {
            wrapper.style.border = '1px solid black'
            wrapper.style.cursor = 'text'
            wrapper.style.display = 'flex'
            wrapper.style.flexWrap = 'wrap'
            wrapper.style.alignItems = 'center'
        }
        if (this._config.wrapperStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.wrapperStyles)) {
                wrapper.style[key] = value
            }
        }
    }

    _setWrapperClass(wrapper) {
        if (this._config.wrapperClasses != undefined) {
            wrapper.setAttribute('class', this._config.wrapperClasses)
        }
    }

    _setErrorStyle(error) {
        if (this._config.clearDefaultStyles == false) {
            error.style.marginBottom = '5px'
            error.style.display = 'inline-block'
            error.style.color = 'red'
        }
        if (this._config.errorStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.errorStyles)) {
                error.style[key] = value
            }
        }
    }

    _setErrorClass(error) {
        if (this._config.errorClasses != undefined) {
            error.setAttribute('class', this._config.errorClasses)
        }
    }

    _setPreviewStyle(preview) {
        if (this._config.previewStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.previewStyles)) {
                preview.style[key] = value
            }
        }
    }

    _setPreviewClass(preview) {
        if (this._config.previewClasses != undefined) {
            preview.setAttribute('class', this._config.previewClasses)
        }
    }

    _setPreviewItemStyle(previewItem) {
        if (this._config.clearDefaultStyles == false) {
            previewItem.style.boxSizing = 'border-box'
            previewItem.style.padding = '5px'
            previewItem.style.margin = '5px'
            previewItem.style.display = 'inline-block'
            previewItem.style.backgroundColor = 'rgb(239, 239, 239)'
        }
        if (this._config.previewItemStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.previewItemStyles)) {
                previewItem.style[key] = value
            }
        }
    }

    _setPreviewItemClass(previewItem) {
        if (this._config.previewItemClasses != undefined) {
            previewItem.setAttribute('class', this._config.previewItemClasses)
        }
    }

    _setDeleteItemButtonStyle(deleteItemButton) {
        if (this._config.clearDefaultStyles == false) {
            deleteItemButton.style.cursor = 'pointer'
            deleteItemButton.style.marginRight = '10px'
            deleteItemButton.style.padding = '0'
            deleteItemButton.style.border = 'none'
            deleteItemButton.style.background = 'transparent'
        }
        if (this._config.deleteItemButtonStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.deleteItemButtonStyles)) {
                deleteItemButton.style[key] = value
            }
        }
    }

    _setDeleteItemButtonClass(deleteItemButton) {
        if (this._config.deleteItemButtonClasses != undefined) {
            deleteItemButton.setAttribute('class', this._config.deleteItemButtonClasses)
        }
    }

    _setInputStyle(input) {
        if (this._config.clearDefaultStyles == false) {
            input.style.border = 'none'
            input.style.outline = 'none'
            input.style.boxSizing = 'border-box'
            input.style.flexGrow = '1'
            input.style.padding = '5px'
        }
        if (this._config.inputStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.inputStyles)) {
                input.style[key] = value
            }
        }
    }

    _setInputClass(input) {
        if (this._config.inputClasses != undefined) {
            input.setAttribute('class', this._config.inputClasses)
        }
    }

    _setAutocompleteWrapperStyle(autocompleteWrapper) {
        if (this._config.clearDefaultStyles == false) {
            autocompleteWrapper.style.position = 'absolute'
            autocompleteWrapper.style.backgroundColor = '#f6f6f6'
        }
        if (this._config.autocompleteWrapperStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.autocompleteWrapperStyles)) {
                autocompleteWrapper.style[key] = value
            }
        }
    }

    _setAutocompleteWrapperClass(autocompleteWrapper) {
        if (this._config.autocompleteWrapperClasses != undefined) {
            autocompleteWrapper.setAttribute('class', this._config.autocompleteWrapperClasses)
        }
    }

    _setAutocompleteContainerStyle(autocompleteContainer) {
        if (this._config.autocompleteContainerStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.autocompleteContainerStyles)) {
                autocompleteContainer.style[key] = value
            }
        }
    }

    _setAutocompleteContainerClass(autocompleteContainer) {
        if (this._config.autocompleteContainerClasses != undefined) {
            autocompleteContainer.setAttribute('class', this._config.autocompleteContainerClasses)
        }
    }

    _setAutocompleteItemStyle(autocompleteItem) {
        if (this._config.clearDefaultStyles == false) {
            autocompleteItem.style.padding = '3px 5px'
            autocompleteItem.style.display = 'inline-block'
            autocompleteItem.style.marginRight = '5px'
            autocompleteItem.style.marginBottom = '5px'
            autocompleteItem.style.backgroundColor = 'rgb(239, 239, 239)'
            autocompleteItem.style.cursor = 'pointer'
        }
        if (this._config.autocompleteItemStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.autocompleteItemStyles)) {
                autocompleteItem.style[key] = value
            }
        }
    }

    _setAutocompleteItemClass(autocompleteItem) {
        if (this._config.autocompleteItemClasses != undefined) {
            autocompleteItem.setAttribute('class', this._config.autocompleteItemClasses)
        }
    }

    _isElement(o) {
        return o instanceof HTMLElement
    }

    getValues(jusTag = false) {
        if (jusTag) {
            return this._values.map(value => value.tag)
        }
        return this._values
    }

    getValuesJSON(jusTag = false) {
        if (jusTag) {
            return JSON.stringify(this._values.map(value => value.tag))
        }
        return JSON.stringify(this._values)
    }

    getRawValues() {
        return this.getValues(true).join(',')
    }

    getAutocompleteItems() {
        if (this._autocompleteItems.length < 1) {
            if (this._element.hasAttribute('data-autocomplete')) {
                const rawAutocomplete = this._element.getAttribute('data-autocomplete')
                return rawAutocomplete.split(',')
            }
            return []
        }
        return this._autocompleteItems
    }

    showAutocomplete(items) {
        this._autocompleteItems = items
        this._showAutocomplete(this._liveInputValue)
        this._autocompleteReady = true
    }

    pauseAutocomplete() {
        this._autocompleteReady = false
    }

    setError(message) {
        this._setError(message)
    }
}