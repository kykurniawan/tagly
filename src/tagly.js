export default class extends EventTarget {
    constructor(element, config = {}) {
        super()
        this._element = element
        this._id = this._element.id
        this._values = []
        this._error = ''
        this._initConfig(config)
        this._createElements()
        this._configureStyle()
        this._configureListener()
        this._setInitValue()
    }

    _initConfig(config) {
        if (config.clearDefaultStyle == undefined) {
            config.clearDefaultStyle = false
        }
        if (config.displayError == undefined) {
            config.displayError = true
        }
        this._config = config
    }

    _createElements() {
        // create wrapper
        const wrapper = document.createElement('div')
        wrapper.setAttribute('id', this._id + '__wrapper')
        if (this._config.wrapperClasses != undefined) {
            this._config.wrapperClasses.forEach(wrapperClass => {
                wrapper.classList.add(wrapperClass)
            })
        }

        // create error message
        const errorMessage = document.createElement('div')
        errorMessage.setAttribute('id', this._id + '__error-message')

        // create value preview
        const preview = document.createElement('span')
        preview.setAttribute('id', this._id + '__preview')
        if (this._config.previewClasses != undefined) {
            this._config.previewClasses.forEach(previewClass => {
                preview.classList.add(previewClass)
            })
        }

        // create input area
        const input = document.createElement('input')
        input.setAttribute('id', this._id + '__input')
        if (this._config.inputClasses != undefined) {
            this._config.inputClasses.forEach(inputClass => {
                input.classList.add(inputClass)
            })
        }
        input.placeholder = 'Type then enter'
        if (this._config.inputPlaceholder != undefined) {
            input.placeholder = this._config.inputPlaceholder
        }

        // create hidden input to store tag value
        const hiddenInput = document.createElement('input')
        hiddenInput.setAttribute('id', this._id + '__value')
        if (this._config.name != undefined) {
            hiddenInput.setAttribute('name', this._config.name)
        } else {
            hiddenInput.setAttribute('name', this._id + '__value')
        }
        hiddenInput.setAttribute('type', 'hidden')

        // add all elements to class instance
        this._wrapper = wrapper
        this._errorMessage = errorMessage
        this._preview = preview
        this._input = input
        this._hiddenInput = hiddenInput

        // append all elements to tag input element
        this._element.append(this._errorMessage)
        this._element.append(this._wrapper)
        this._wrapper.append(this._preview)
        this._wrapper.append(this._input)
        this._wrapper.append(this._hiddenInput)
    }

    _configureStyle() {
        // styling the tag input wrapper
        if (this._config.clearDefaultStyle == false) {
            this._wrapper.style.border = '1px solid black'
            this._wrapper.style.cursor = 'text'
            this._wrapper.style.display = 'flex'
            this._wrapper.style.flexWrap = 'wrap'
            this._wrapper.style.alignItems = 'center'
        }
        if (this._config.wrapperStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.wrapperStyles)) {
                this._wrapper.style[key] = value
            }
        }

        // styling the input
        if (this._config.clearDefaultStyle == false) {
            this._input.style.border = 'none'
            this._input.style.outline = 'none'
            this._input.style.boxSizing = 'border-box'
            this._input.style.flexGrow = '1'
            this._input.style.padding = '5px'
        }
        if (this._config.inputStyles != undefined) {
            for (const [key, value] of Object.entries(this._config.inputStyles)) {
                this._input.style[key] = value
            }
        }
    }

    _configureListener() {
        this._element.addEventListener('click', (evt) => {
            this._input.focus()
        })

        this._input.addEventListener('keydown', (evt) => {
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

        this._input.addEventListener('keypress', (evt) => {
            if (evt.key == 'Enter' || evt.key == ',') {
                evt.preventDefault()
                let tag = this._sanitizeTag(evt.target.value)
                if (tag != '') {
                    let value = {
                        id: this._uniqueId(),
                        tag: tag
                    }
                    this._addValue(value)
                }
                evt.target.value = ''
            }
        })
    }

    _setError(message) {
        if (this._config.displayError) {
            let error = document.createElement('span')
            if (this._config.clearDefaultStyle == false) {
                error.style.marginBottom = '5px'
                error.style.display = 'inline-block'
                error.style.color = 'red'
            }
            if (this._config.errorStyles != undefined) {
                for (const [key, value] of Object.entries(this._config.errorStyles)) {
                    error.style[key] = value
                }
            }
            if (this._config.errorClasses != undefined) {
                this._config.errorClasses.forEach(errorClass => {
                    error.classList.add(errorClass)
                })
            }
            error.textContent = message
            this._errorMessage.append(error)
        }
        const onError = new CustomEvent('error', {
            detail: message
        })
        this.dispatchEvent(onError)
    }

    _clearError() {
        this._errorMessage.innerHTML = ''
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

    _setValues(values) {
        this._values = values
        this._updatePreview()
        this._updateHiddenInputValue()
    }

    _addValue(value) {
        if (this._values.filter(v => {
            return v.tag == value.tag
        }).length < 1) {
            this._values.push(value)
            this._updatePreview()
            this._updateHiddenInputValue()
            const onAdded = new CustomEvent('added', {
                detail: value
            })
            this.dispatchEvent(onAdded)
            const onChanged = new CustomEvent('changed', {
                detail: this._values
            })
            this.dispatchEvent(onChanged)
        }

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

        const onRemoved = new CustomEvent('removed', {
            detail: valueToRemove
        })
        this.dispatchEvent(onRemoved)
        const onChanged = new CustomEvent('changed', {
            detail: this._values
        })
        this.dispatchEvent(onChanged)
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
        this._hiddenInput.value = this._values.map(value => {
            return value.tag
        }).join(',')
    }

    _sanitizeRawValue(rawValue) {
        let values = []
        rawValue.split(',').forEach(value => {
            value = this._sanitizeTag(value)
            if (value != '') {
                const id = this._uniqueId()
                const tag = value

                if (values.filter(v => {
                    return v.tag == tag
                }).length < 1) {
                    values.push({
                        id, tag
                    })
                }
            }
        })

        return values
    }

    _sanitizeTag(tag) {
        tag = tag.trim().replace(/(^\w|\s\w)/g, m => m.toUpperCase())
        if (this._isValidTag(tag) == false) {
            tag = ''
        }
        return tag
    }

    _isValidTag(tag) {
        if (!this._isAlphaNumericSpace(tag)) {
            this._setError('Only alphanumeric and space are allowed')
            return false
        }
        this._clearError()
        return true
    }

    _createPreviewItem(id, tag, text) {
        let deleteItemButton = document.createElement('button')
        deleteItemButton.tabIndex = '-1'
        deleteItemButton.innerHTML = '&#10007;'
        if (this._config.deleteItemButtonInnerHTML != undefined) {
            deleteItemButton.innerHTML = this._config.deleteItemButtonInnerHTML
        }
        if (this._config.clearDefaultStyle == false) {
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
        if (this._config.deleteItemButtonClasses != undefined) {
            this._config.deleteItemButtonClasses.forEach(deleteItemButtonClass => {
                deleteItemButton.classList.add(deleteItemButtonClass)
            })
        }
        deleteItemButton.addEventListener('click', (evt) => {
            this._removeValue(evt.target.parentElement.id)
        })

        let previewItem = document.createElement('span')
        if (this._config.clearDefaultStyle == false) {
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

        previewItem.setAttribute('id', id)
        previewItem.setAttribute('data-tag', tag)
        if (this._config.previewItemClasses != undefined) {
            this._config.previewItemClasses.forEach(previewItemClass => {
                previewItem.classList.add(previewItemClass)
            })
        }
        previewItem.append(deleteItemButton)
        previewItem.append(text)

        return previewItem
    }

    _uniqueId() {
        return Math.random().toString(36).replace('.', '')
    }

    _isAlphaNumericSpace(text) {
        return text.match(/^[0-9a-zA-Z ]+$/)
    }
}