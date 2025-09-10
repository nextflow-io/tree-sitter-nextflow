// Test file for Nextflow keyword highlighting

nextflow.enable.dsl = 2
// <- keyword
//       ^ property
//              ^ property
//                    ^ operator

params.input = "data.txt"
// <- keyword
//     ^ property
//             ^ operator
//               ^ string

process EXAMPLE {
// <- keyword
//      ^ function

    input:
    // <- label
    val x
    // <- type.builtin
    //  ^ variable

    output:
    // <- label
    stdout
    // <- type.builtin

    script:
    // <- label
    """
    // <- string
    echo ${x}
    //   ^ embedded
    //     ^ variable
    """
}

workflow MAIN {
// <- keyword
//       ^ function

    take:
    // <- label
    ch

    main:
    // <- label
    EXAMPLE(ch)
    //      ^ variable

    emit:
    // <- label
    EXAMPLE.out
}

if (params.test) {
// <- keyword.control
//  ^ punctuation.bracket
//         ^ property
    println "Testing mode"
}

for (item in items) {
// <- keyword.control
//   ^ punctuation.bracket
//        ^ keyword.control
    println item
}
