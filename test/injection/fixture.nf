// Fixture for scripts/check_injections.sh: every string kind as a script
// body, plus stub, implicit script, prelude, and exec (not injected) cases.
// Keep in sync with expected.txt.

process INTERP_TRIPLE {
    script:
    """
    echo hello
    ls -la ${params.dir}
    """
}

process INTERP_DOUBLE {
    script:
    "echo ${params.greeting}"
}

process PLAIN_SINGLE {
    script:
    'echo hello'
}

process PLAIN_TRIPLE {
    script:
    '''
    echo hello
    '''
}

process STUB_AND_PRELUDE {
    script:
    def args = task.ext.args ?: ''
    """
    tool ${args}
    """

    stub:
    """
    touch out.txt
    """
}

process IMPLICIT {
    """
    echo implicit
    """
}

process EXEC_NOT_INJECTED {
    exec:
    println 'not bash'
}
