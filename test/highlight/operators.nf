// Test file for Nextflow operator highlighting

x = 5
// <- operator.assignment

y += 10
//  ^ operator.assignment

result == expected
//     ^ operator

a != b
//  ^ operator

x > y && z < w
//  ^ operator
//     ^ operator
//         ^ operator

text =~ /pattern/
//   ^ operator
//      ^ string.regex

channel | process
//      ^ operator.channel

output -> input
//     ^ operator.channel

x + y * z / w - v % 2
//  ^ operator
//      ^ operator
//          ^ operator
//              ^ operator
//                  ^ operator
