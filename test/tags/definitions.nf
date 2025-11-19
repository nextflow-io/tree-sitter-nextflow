// Test file for Nextflow symbol definitions

process EXAMPLE {
//      ^ definition.method
    input:
    val x
    output:
    stdout
    script:
    "echo hello"
}

workflow MAIN {
//       ^ definition.function
    take:
    ch

    main:
    EXAMPLE(ch)

    emit:
    EXAMPLE.out
}

def helper(x, y) {
//  ^ definition.function
    return x + y
}

params.input = "data.txt"
//     ^ definition.variable

params.output_dir = "results/"
//     ^ definition.variable
