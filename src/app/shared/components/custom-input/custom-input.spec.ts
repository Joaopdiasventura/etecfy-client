import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomInput } from './custom-input';

describe('CustomInput', () => {
  let component: CustomInput;
  let fixture: ComponentFixture<CustomInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomInput]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomInput);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
