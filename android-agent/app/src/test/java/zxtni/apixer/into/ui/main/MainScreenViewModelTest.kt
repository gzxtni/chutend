package zxtni.apixer.into.ui.main

import junit.framework.TestCase.assertNotNull
import junit.framework.TestCase.assertFalse
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Test

class MainScreenViewModelTest {
    @Test
    fun uiState_initialStateIsNotNull() = runTest {
        val viewModel = MainScreenViewModel()
        val state = viewModel.uiState.first()
        assertNotNull(state)
        assertFalse(state.isSyncing)
    }
}
