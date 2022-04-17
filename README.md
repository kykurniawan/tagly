# Tagly: Simple HTML Tag Input

This is a simple HTML tag input for your project

### Usage
To use this library, you can directly download this repository and embed minified javascript file from dist folder to your page. Please see example bellow:
```html
<!DOCTYPE html>
<html lang="en">
    <body>
        <form>
            <div id="tag-input"></div>
            <button type="submit">Submit</button>
        </form>

        <script src="path/to/tagly.min.js"/>
            // grap tag input element
            let taglyElement = document.querySelector('div#tag-input')
            // create new tag input element
            new Tagly(taglyElement)
        <script>

        </script>
    </body>
</html>
```

### Optional Configuration
When creating Tagly element, you might want to costumize the tag input. To accomplish this, you can pas optional configuration as second parameter when creating new Tagly element. Please see example bellow:
```html
<!DOCTYPE html>
<html lang="en">
    <body>
        <form>
            <div id="tag-input"></div>
            <button type="submit">Submit</button>
        </form>

        <script src="path/to/tagly.min.js"/>
            // grap tag input element
            let taglyElement = document.querySelector('div#tag-input')
            // create new tag input element
            new Tagly(taglyElement, {
                // the name of the field to be sent to the backend.
                name: 'tags',
                // tag input placeholder
                inputPlaceholder: 'Type post tags.'
            })
        <script>

        </script>
    </body>
</html>
```