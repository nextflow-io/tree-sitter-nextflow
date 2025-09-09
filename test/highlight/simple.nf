nextflow.enable.dsl = 2
params.input = "data.txt"

process EXAMPLE {
    input:
    val x
    
    output:
    stdout
    
    script:
    "echo hello"
}