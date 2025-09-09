// Test file for Nextflow string highlighting

message = "Hello world"
//        ^ string

name = 'single quoted'
//     ^ string

regex = /pattern/
//      ^ string.regex

interpolated = "Value: ${x}"
//             ^ string
//                     ^ embedded
//                       ^ variable

template = """
// <- string
Multi-line string
with ${variable}
//   ^ embedded
//     ^ variable
"""

triple_single = '''
// <- string
Literal string
no interpolation: ${x}
'''