// Package queue runs render jobs with a concurrency limit (foundation for batch /
// daily renders and the web app's render queue).
package queue

import "sync"

// Run executes jobs with at most `concurrency` in flight; returns each job's error by index.
func Run(jobs []func() error, concurrency int) []error {
	if concurrency < 1 {
		concurrency = 1
	}
	sem := make(chan struct{}, concurrency)
	errs := make([]error, len(jobs))
	var wg sync.WaitGroup
	for i, job := range jobs {
		wg.Add(1)
		sem <- struct{}{}
		go func(i int, job func() error) {
			defer wg.Done()
			defer func() { <-sem }()
			errs[i] = job()
		}(i, job)
	}
	wg.Wait()
	return errs
}
